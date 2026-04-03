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
    }

    init(playerCount, deckKey) {
        this.players = [];
        this.pool = [];
        this.isRunning = true;
        this.activeDeck = DECKS_MANAGER[deckKey] || DECKS_MANAGER["cars"];
        
        let shuffledDeck = [...this.activeDeck.cards].sort(() => Math.random() - 0.5);

        for (let i = 0; i < playerCount; i++) {
            this.players.push({
                id: i,
                name: i === 0 ? "Você" : `Bot ${i + 1}`,
                isBot: i !== 0,
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
        this.log(`O jogo começou! O ${this.getCurrentPlayer().name} começa.`);
        
        this.startTurn();
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    log(msg, type="info") {
        if(this.onLog) this.onLog(msg, type);
    }

    startTurn() {
        if (!this.isRunning) return;
        
        const current = this.getCurrentPlayer();
        
        if (current.deck.length === 0) {
            // Player is eliminated, skip to next
            this.nextPlayer();
            return;
        }

        if (this.onTurnUpdate) this.onTurnUpdate(this.currentPlayerIndex);
        
        if (current.isBot) {
            this.log(`É a vez de ${current.name} (pensando...)`);
            setTimeout(() => this.botPlay(), 2000);
        } else {
            this.log(`É a sua vez! Escolha uma característica da sua carta.`);
        }
    }

    botPlay() {
        if (!this.isRunning) return;
        const current = this.getCurrentPlayer();
        const topCard = current.deck[0];
        
        // Randomly pick a property
        const keys = this.activeDeck.properties.map(p => p.key);
        const randomProp = keys[Math.floor(Math.random() * keys.length)];
        
        const propLabel = this.activeDeck.properties.find(p => p.key === randomProp).label;
        this.log(`${current.name} escolheu a característica: ${propLabel}`);
        
        this.playTurn(randomProp);
    }

    playTurn(propertyKey) {
        if (!this.isRunning) return;
        
        const propLabel = this.activeDeck.properties.find(p => p.key === propertyKey).label;
        
        // Gather all top cards
        let currentRoundCards = [];
        let activePlayers = []; // index to active player
        
        this.players.forEach((p, idx) => {
            if (p.deck.length > 0) {
                currentRoundCards.push({
                    card: p.deck[0],
                    playerIndex: idx
                });
                activePlayers.push(idx);
            }
        });

        // Check for Super Trunfo
        let superTrunfoEntry = currentRoundCards.find(c => c.card.superTrunfo);
        let categoryAEntry = currentRoundCards.find(c => c.card.category.endsWith('-A'));

        let winnerIndex = -1;
        let isTie = false;
        let tiedPlayers = [];

        if (superTrunfoEntry && !categoryAEntry) {
            // Super trunfo wins instantly except against A
            winnerIndex = superTrunfoEntry.playerIndex;
            this.log(`Super Trunfo (${superTrunfoEntry.card.name}) venceu a rodada!`, "st");
        } else if (superTrunfoEntry && categoryAEntry) {
            // A wins against ST
            winnerIndex = categoryAEntry.playerIndex;
            this.log(`O final -A (${categoryAEntry.card.name}) superou o Super Trunfo!`, "st");
        } else {
            // Normal battle (Highest wins)
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
                this.log(`${this.players[winnerIndex].name} venceu a rodada em ${propLabel} com ${highestVal}!`);
            }
        }

        // Process round result
        if (this.onRoundResult) {
            this.onRoundResult({
                cards: currentRoundCards,
                propertyKey,
                winnerIndex,
                activePlayerIndex: this.currentPlayerIndex,
                tiedPlayers: tiedPlayers || [],
                isTie,
                isST: superTrunfoEntry != null
            });
        }

        // Wait for UI to show the result overlay, user will click "Continuar"
        this.resolveContinue = () => {
            this.resolveContinue = null; // clear it
            
            // Remove top cards
            let cardsPlayed = [];
            this.players.forEach(p => {
                if (p.deck.length > 0) {
                    cardsPlayed.push(p.deck.shift());
                }
            });

            // Tell UI to animate Player 1 card (if playing) sliding UP (lose) or DOWN (win)
            let p1Involved = currentRoundCards.find(c => c.playerIndex === 0);
            if (p1Involved && this.onCardTransfer) {
                this.onCardTransfer(winnerIndex === 0, isTie);
            }

            // Wait 1 second for slide animation to complete
            setTimeout(() => {
                if (isTie) {
                    this.log("Empate! As cartas vão para a mesa.", "tie");
                    this.pool.push(...cardsPlayed);
                    // currentPlayerIndex stays the SAME!
                } else {
                    let winner = this.players[winnerIndex];
                    winner.deck.push(...cardsPlayed, ...this.pool);
                    this.pool = []; // Clear pool
                    // Winner plays next
                    this.currentPlayerIndex = winnerIndex;
                }

                if (this.onRoundEnd) this.onRoundEnd();

                // Check overall winner
                const alivePlayers = this.players.filter(p => p.deck.length > 0);
                if (alivePlayers.length === 1) {
                    this.isRunning = false;
                    if (this.onGameOver) this.onGameOver(alivePlayers[0]);
                    return;
                }

                // Next round
                setTimeout(() => this.startTurn(), 1000);
                
            }, 800); // 800ms for slide animation
        };
    }

    nextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.startTurn();
    }
}
