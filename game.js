class Game {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.pool = [];
        this.isRunning = false;
        this.onTurnUpdate = null;
        this.onRoundEnd = null;
        this.onGameOver = null;
        this.onLog = null;
        this.activeDeck = null;
        this.isMultiplayer = false;
        this.isHost = true;
        
        // Host hook for guest action
        window.onHostReceiveGuestAction = (action) => {
            if (this.isHost && this.isRunning && action.playerIndex === this.currentPlayerIndex) {
                this.playTurn(action.propertyKey);
            }
        };
    }

    initLocal(config) {
        this.isMultiplayer = false;
        this.isHost = true;
        this.init(config.humans + config.bots, config.deckKey, {
            humans: config.humans,
            bots: config.bots,
            names: [config.hostName]
        });
    }

    initHostMultiplayer() {
        this.isMultiplayer = true;
        this.isHost = true;
        
        const db = firebase.database();
        db.ref('rooms/' + Network.roomId).once('value').then(snap => {
            const data = snap.val();
            const config = data.config;
            let names = [];
            for (let i = 0; i < config.humans; i++) {
                names.push(data.players[i] ? data.players[i].name : `Jogador ${i+1}`);
            }
            this.init(config.totalPlayers, config.deckKey, {
                 humans: config.humans,
                 bots: config.bots,
                 names: names
            });
        });
        
        // Listen for player disconnections to turn them into bots
        db.ref(`rooms/${Network.roomId}/players`).on('child_changed', snap => {
            const val = snap.val();
            const idx = parseInt(snap.key);
            if (val && !val.connected && !val.isBot && this.isRunning) {
                this.log(`${val.name} desconectou. O bot assumirá o controle.`);
                Network.setPlayerAsBot(idx, val.name);
                this.players[idx].isBot = true;
                this.players[idx].name = val.name + " (Bot)";
                this.syncState();
                
                // If it was their turn, trigger bot play
                if (this.currentPlayerIndex === idx) {
                    setTimeout(() => this.botPlay(), 2000);
                }
            }
        });
    }

    init(playerCount, deckKey, options) {
        this.players = [];
        this.pool = [];
        this.isRunning = true;
        this.activeDeck = DECKS_MANAGER[deckKey] || DECKS_MANAGER["cars"];
        
        let shuffledDeck = [...this.activeDeck.cards].sort(() => Math.random() - 0.5);

        for (let i = 0; i < playerCount; i++) {
             let isBot = i >= options.humans;
             let name = isBot ? `Bot ${i - options.humans + 1}` : (options.names[i] || `Jogador ${i+1}`);
             this.players.push({
                 id: i,
                 name: name,
                 isBot: isBot,
                 deck: []
             });
        }

        // Deal cards
        let count = 0;
        while (count < shuffledDeck.length) {
            this.players[count % playerCount].deck.push(shuffledDeck[count]);
            count++;
        }

        this.currentPlayerIndex = Math.floor(Math.random() * playerCount);
        this.log(`O jogo começou! O ${this.players[this.currentPlayerIndex].name} começa.`);
        
        if (this.isMultiplayer && this.isHost) {
            Network.startGame(this.getState());
            // clear ready next flags
            firebase.database().ref('rooms/' + Network.roomId + '/game/readyNext').remove();
        }
        
        this.startTurn();
    }

    getState() {
         return {
             players: this.players,
             currentPlayerIndex: this.currentPlayerIndex,
             pool: this.pool,
             isRunning: this.isRunning,
             lastLog: this.lastLog || null,
             roundResult: this.roundResult || null
         };
    }

    syncState() {
         if (this.isMultiplayer && this.isHost) {
             Network.updateGameState(this.getState());
         }
    }

    // Guest enters via Network updates
    syncNetwork(data) {
        const state = data.game;
        if (!state) return;
        
        if (!this.isMultiplayer) {
            this.isMultiplayer = true;
            this.isHost = false;
            this.activeDeck = DECKS_MANAGER[data.config.deckKey] || DECKS_MANAGER["cars"];
        }

        this.players = state.players || [];
        this.currentPlayerIndex = state.currentPlayerIndex;
        this.pool = state.pool || [];
        this.isRunning = state.isRunning;
        this.roundResult = state.roundResult;

        if (this.onTurnUpdate) this.onTurnUpdate(this.currentPlayerIndex);
        if (this.onRoundEnd) this.onRoundEnd(); // updates UI
        
        // Process new log
        if (state.lastLog && state.lastLog.ts !== this.lastLogTs) {
            this.lastLogTs = state.lastLog.ts;
            this.log(state.lastLog.msg, state.lastLog.type, true);
        }

        // Process Round Result popup
        if (this.roundResult) {
            if (this.onRoundResult && this.showingResultTS !== this.roundResult.ts) {
                this.showingResultTS = this.roundResult.ts;
                
                this.resolveContinue = () => {
                    this.resolveContinue = null;
                    if (this.isMultiplayer && !this.isHost) {
                        Network.setReadyNextRound(true);
                    }
                };
                
                this.onRoundResult(this.roundResult);
            }
        } else {
            this.showingResultTS = null;
        }
        
        if (!this.isRunning && this.onGameOver) {
            const alivePlayers = this.players.filter(p => p.deck && p.deck.length > 0);
            this.onGameOver(alivePlayers[0] || { id: -1, name: 'Empate' });
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    log(msg, type="info", fromNetwork=false) {
        if(this.onLog) this.onLog(msg, type);
        
        if (!fromNetwork && this.isHost) {
            this.lastLog = { msg, type, ts: Date.now() };
            this.syncState();
        }
    }

    startTurn() {
        if (!this.isHost) return;
        if (!this.isRunning) return;
        
        const current = this.getCurrentPlayer();
        
        if (!current.deck || current.deck.length === 0) {
            this.nextPlayer();
            return;
        }

        if (this.onTurnUpdate) this.onTurnUpdate(this.currentPlayerIndex);
        this.syncState();
        
        if (current.isBot) {
            this.log(`É a vez de ${current.name} (pensando...)`);
            setTimeout(() => this.botPlay(), 2000);
        } else {
            if (current.id === Network.playerId || (!this.isMultiplayer && current.id === 0)) {
                this.log(`É a sua vez! Escolha uma característica da sua carta.`);
            } else {
                this.log(`É a vez de ${current.name}. Aguardando escolha...`);
            }
        }
    }

    botPlay() {
        if (!this.isRunning || !this.isHost) return;
        const current = this.getCurrentPlayer();
        
        const keys = this.activeDeck.properties.map(p => p.key);
        const randomProp = keys[Math.floor(Math.random() * keys.length)];
        
        const propLabel = this.activeDeck.properties.find(p => p.key === randomProp).label;
        this.log(`${current.name} (Bot) escolheu a característica: ${propLabel}`);
        
        this.playTurn(randomProp);
    }

    playTurn(propertyKey) {
        if (!this.isRunning) return;
        
        // If Guest, send to Host
        if (this.isMultiplayer && !this.isHost) {
            if (this.currentPlayerIndex === Network.playerId) {
                Network.sendAction(propertyKey);
            }
            return;
        }
        
        // Host logic below
        if (!this.isHost) return;
        
        const propLabel = this.activeDeck.properties.find(p => p.key === propertyKey).label;
        
        let currentRoundCards = [];
        let activePlayers = [];
        
        this.players.forEach((p, idx) => {
            if (p.deck && p.deck.length > 0) {
                currentRoundCards.push({
                    card: p.deck[0],
                    playerIndex: idx
                });
                activePlayers.push(idx);
            }
        });

        // Evaluate
        let superTrunfoEntry = currentRoundCards.find(c => c.card.superTrunfo);
        let categoryAEntries = currentRoundCards.filter(c => c.card.category.endsWith('-A'));

        let winnerIndex = -1;
        let isTie = false;
        let tiedPlayers = [];

        if (superTrunfoEntry && categoryAEntries.length === 0) {
            winnerIndex = superTrunfoEntry.playerIndex;
            this.log(`Super Trunfo (${superTrunfoEntry.card.name}) venceu a rodada!`, "st");
        } else if (superTrunfoEntry && categoryAEntries.length > 0) {
            let highestVal = -Infinity;
            for (let entry of categoryAEntries) {
                let val = entry.card.properties[propertyKey];
                if (val > highestVal) {
                    highestVal = val;
                    winnerIndex = entry.playerIndex;
                    tiedPlayers = [entry.playerIndex];
                } else if (val === highestVal) {
                    tiedPlayers.push(entry.playerIndex);
                }
            }
            if (tiedPlayers.length > 1) {
                isTie = true;
                this.log(`As cartas com final -A empataram e superaram o Super Trunfo!`, "st");
            } else {
                let winningEntry = categoryAEntries.find(e => e.playerIndex === winnerIndex);
                this.log(`O final -A (${winningEntry.card.name}) superou o Super Trunfo!`, "st");
            }
        } else {
            let highestVal = -Infinity;
            for (let entry of currentRoundCards) {
                let val = entry.card.properties[propertyKey];
                if (val > highestVal) {
                    highestVal = val;
                    winnerIndex = entry.playerIndex;
                    tiedPlayers = [entry.playerIndex];
                } else if (val === highestVal) {
                    tiedPlayers.push(entry.playerIndex);
                }
            }

            if (tiedPlayers.length > 1) {
                isTie = true;
            } else {
                this.log(`${this.players[winnerIndex].name} venceu a rodada em ${propLabel}!`);
            }
        }

        const roundData = {
            cards: currentRoundCards,
            propertyKey,
            winnerIndex,
            activePlayerIndex: this.currentPlayerIndex,
            tiedPlayers: tiedPlayers || [],
            isTie,
            isST: superTrunfoEntry != null,
            ts: Date.now()
        };
        
        this.roundResult = roundData;
        
        if (this.isMultiplayer) {
            this.syncState();
            this.waitForNetworkContinue(roundData);
        } else {
            if (this.onRoundResult) this.onRoundResult(roundData);
            this.resolveContinue = () => {
                this.resolveContinue = null;
                this.finishRound(roundData);
            };
        }
    }
    
    waitForNetworkContinue(roundData) {
        // Unsubscribe if existing
        if (this.readyNextRef) this.readyNextRef.off();
        
        this.readyNextRef = firebase.database().ref('rooms/' + Network.roomId + '/game/readyNext');
        
        // Also the Host must mark itself as ready when clicking continue
        this.resolveContinue = () => {
            this.resolveContinue = null;
            Network.setReadyNextRound(true);
        };
        
        this.readyNextRef.on('value', snap => {
            const readyMap = snap.val() || {};
            let allHumansReady = true;
            
            // Check if all connected humans are ready
            firebase.database().ref('rooms/' + Network.roomId + '/players').once('value').then(pSnap => {
                const pMap = pSnap.val() || {};
                
                Object.keys(pMap).forEach(key => {
                    const p = pMap[key];
                    if (p && !p.isBot && p.connected) {
                        if (!readyMap[key]) {
                            allHumansReady = false;
                        }
                    }
                });
                
                if (allHumansReady) {
                    this.readyNextRef.off(); // stop listening
                    this.readyNextRef.remove(); // clear for next round
                    this.finishRound(roundData);
                }
            });
        });
    }

    finishRound(roundData) {
        this.roundResult = null;
        
        let cardsPlayed = [];
        this.players.forEach(p => {
            if (p.deck && p.deck.length > 0) {
                cardsPlayed.push(p.deck.shift());
            }
        });

        // Trigger animation
        let p1Involved = roundData.cards.find(c => c.playerIndex === Network.playerId || (!this.isMultiplayer && c.playerIndex === 0));
        let myId = this.isMultiplayer ? Network.playerId : 0;
        if (p1Involved && this.onCardTransfer) {
            this.onCardTransfer(roundData.winnerIndex === myId, roundData.isTie);
        }

        setTimeout(() => {
            if (roundData.isTie) {
                this.log("Empate! As cartas vão para a mesa.", "tie");
                this.pool.push(...cardsPlayed);
            } else {
                let winner = this.players[roundData.winnerIndex];
                winner.deck.push(...cardsPlayed, ...this.pool);
                this.pool = [];
                this.currentPlayerIndex = roundData.winnerIndex;
            }

            if (this.onRoundEnd) this.onRoundEnd();
            this.syncState();

            const alivePlayers = this.players.filter(p => p.deck && p.deck.length > 0);
            const aliveHumans = alivePlayers.filter(p => !p.isBot);
            
            if (alivePlayers.length <= 1 || (this.isMultiplayer && aliveHumans.length === 0)) {
                this.isRunning = false;
                if (this.onGameOver) this.onGameOver(alivePlayers[0] || {id:-1, name:'Empate'});
                this.syncState();
                return;
            }

            setTimeout(() => this.startTurn(), 1000);

        }, 800);
    }

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.startTurn();
    }
}
