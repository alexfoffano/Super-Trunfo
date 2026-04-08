class UI {
    constructor(game) {
        this.game = game;

        // Screens
        this.titleScreen = document.getElementById('title-screen');
        this.setupScreen = document.getElementById('setup-screen');
        this.lobbyScreen = document.getElementById('lobby-screen');
        this.joinScreen = document.getElementById('join-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.endScreen = document.getElementById('end-screen');

        // Buttons
        this.btnPlay = document.getElementById('btn-play');
        this.btnStartSetup = document.getElementById('btn-start-setup');
        this.btnStartMultiplayer = document.getElementById('btn-start-multiplayer');
        this.btnCopyLink = document.getElementById('btn-copy-link');
        this.btnJoinRoom = document.getElementById('btn-join-room');
        this.btnRestart = document.getElementById('btn-restart');

        // Form
        this.playerName = document.getElementById('player-name');
        this.humanCount = document.getElementById('human-count');
        this.botCount = document.getElementById('bot-count');
        this.humanVal = document.getElementById('human-val');
        this.botVal = document.getElementById('bot-val');
        this.deckSelect = document.getElementById('deck-select');

        // Join
        this.joinName = document.getElementById('join-name');

        // Lobby
        this.inviteLink = document.getElementById('invite-link');
        this.lobbyCount = document.getElementById('lobby-count');
        this.lobbyTotal = document.getElementById('lobby-total');
        this.lobbyPlayersList = document.getElementById('lobby-players-list');

        // Game Elements
        this.currentPlayerName = document.getElementById('current-player-name');
        this.poolCount = document.getElementById('pool-count');
        this.poolIndicator = document.getElementById('pool-indicator');
        this.p1CardContainer = document.getElementById('p1-card-container');
        this.playersContainer = document.getElementById('players-container');
        this.logList = document.getElementById('log-list');
        this.actionLog = document.getElementById('action-log');

        // Result Overlay
        this.resultOverlay = document.getElementById('round-result-overlay');
        this.resultWinner = document.getElementById('round-result-winner');
        this.resultList = document.getElementById('round-result-list');
        this.btnContinue = document.getElementById('btn-continue');

        this.processingRound = false;

        this.bindEvents();
    }

    bindEvents() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomToJoin = urlParams.get('room');
        
        if (roomToJoin) {
            this.titleScreen.classList.remove('active');
            this.titleScreen.classList.add('hide');
            this.showScreen(this.joinScreen);
            
            this.btnJoinRoom.addEventListener('click', () => {
                const name = this.joinName.value.trim() || "Convidado";
                this.btnJoinRoom.disabled = true;
                Network.joinRoom(roomToJoin, name, () => {
                    this.showScreen(this.lobbyScreen);
                }, (err) => { 
                    alert(err); 
                    this.btnJoinRoom.disabled = false;
                    window.location.href = window.location.pathname; // clear url
                });
            });
        }

        this.btnPlay.addEventListener('click', () => this.showScreen(this.setupScreen));

        this.humanCount.addEventListener('input', (e) => {
            let h = parseInt(this.humanCount.value);
            let b = parseInt(this.botCount.value);
            if (h + b > 8) {
                b = 8 - h;
                this.botCount.value = b;
            } else if (h + b < 2) {
                b = 2 - h;
                this.botCount.value = b;
            }
            this.humanVal.textContent = h;
            this.botVal.textContent = b;
        });

        this.botCount.addEventListener('input', (e) => {
            let h = parseInt(this.humanCount.value);
            let b = parseInt(this.botCount.value);
            if (h + b > 8) {
                h = 8 - b;
                this.humanCount.value = h;
            } else if (h + b < 2) {
                h = 2 - b;
                this.humanCount.value = h;
            }
            this.humanVal.textContent = h;
            this.botVal.textContent = b;
        });

        this.btnStartSetup.addEventListener('click', () => {
            const h = parseInt(this.humanCount.value);
            const b = parseInt(this.botCount.value);
            const total = h + b;
            
            if (total < 2 || total > 8) {
                alert("O total de jogadores (Humanos + Bots) deve ser entre 2 e 8.");
                return;
            }
            
            const config = {
                hostName: this.playerName.value.trim() || 'Você',
                humans: h,
                bots: b,
                deckKey: this.deckSelect.value
            };
            
            if (h <= 1) {
                // Singleplayer Local or Spectator (no room created)
                this.showScreen(this.gameScreen);
                this.logList.innerHTML = '';
                this.game.initLocal(config);
            } else {
                // Multiplayer
                this.btnStartSetup.disabled = true;
                Network.createRoom(config, (roomId) => {
                    this.inviteLink.value = window.location.origin + window.location.pathname + "?room=" + roomId;
                    this.showScreen(this.lobbyScreen);
                });
            }
        });
        
        this.btnCopyLink.addEventListener('click', () => {
            this.inviteLink.select();
            document.execCommand('copy');
            alert("Link copiado!");
        });
        
        this.btnStartMultiplayer.addEventListener('click', () => {
            this.game.initHostMultiplayer();
        });

        // Network UI hooks
        window.onNetworkUpdate = (data) => this.handleNetworkState(data);

        this.btnRestart.addEventListener('click', () => {
            this.showScreen(this.setupScreen);
        });

        this.btnContinue.addEventListener('click', () => {
            if (this.game.isMultiplayer) {
                this.btnContinue.disabled = true;
                if (this.game.resolveContinue) {
                    this.game.resolveContinue();
                }
            } else {
                this.hideResultOverlay();
                if (this.game.resolveContinue) {
                    this.game.resolveContinue();
                }
            }
        });

        // Game hooks
        this.game.onLog = (msg, type) => this.addLog(msg, type);
        this.game.onTurnUpdate = (idx) => this.updateTurn(idx);
        this.game.onRoundEnd = () => this.updateGameState();
        this.game.onGameOver = (winner) => this.showEndScreen(winner);
        this.game.onRoundResult = (data) => this.showRoundResult(data);
        this.game.onCardTransfer = (won, isTie) => this.animateCardTransfer(won, isTie);
    }

    hideResultOverlay() {
        if (!this.resultOverlay.classList.contains('hide')) {
            this.resultOverlay.classList.remove('active');
            setTimeout(() => this.resultOverlay.classList.add('hide'), 300);
        }
    }

    showScreen(screenObj) {
        [this.titleScreen, this.setupScreen, this.lobbyScreen, this.joinScreen, this.gameScreen, this.endScreen].forEach(s => {
            s.classList.remove('active');
            s.classList.add('hide');
        });
        screenObj.classList.remove('hide');
        setTimeout(() => screenObj.classList.add('active'), 100);
    }
    
    handleNetworkState(data) {
        if (data.state === 'lobby') {
            let joinedCount = 0;
            this.lobbyPlayersList.innerHTML = '';
            let allReady = true;

            for (let i = 0; i < data.config.humans; i++) {
                const p = data.players[i];
                const li = document.createElement('li');
                li.style.padding = "5px 0";
                li.style.borderBottom = "1px solid rgba(255,255,255,0.1)";

                if (p) {
                    joinedCount++;
                    const statusColor = p.connected ? 'var(--secondary-color)' : 'red';
                    const statusText = p.connected ? (p.isReady ? 'Pronto' : 'Conectado') : 'Desconectado';
                    li.innerHTML = `<strong>${p.name}</strong> - <span style="color:${statusColor}">${statusText}</span>`;
                } else {
                    li.textContent = `Aguardando jogador ${i + 1}...`;
                    li.style.color = "#888";
                    allReady = false;
                }
                this.lobbyPlayersList.appendChild(li);
            }
            
            this.lobbyCount.textContent = joinedCount;
            this.lobbyTotal.textContent = data.config.humans;
            
            if (Network.isHost) {
                this.btnStartMultiplayer.disabled = !allReady || joinedCount < data.config.humans;
            } else {
                this.btnStartMultiplayer.style.display = 'none';
            }
        } else if (data.state === 'playing') {
            if (this.gameScreen.classList.contains('hide')) {
                // Everyone goes to game screen
                this.showScreen(this.gameScreen);
                this.logList.innerHTML = '';
            }
            this.game.syncNetwork(data);
            
            // Check ready state and update button if overlay is active
            if (!this.resultOverlay.classList.contains('hide') && data.game) {
                let readyCount = 0;
                let totalHumans = 0;
                
                Object.keys(data.players || {}).forEach(key => {
                    const p = data.players[key];
                    if (p && !p.isBot && p.connected) {
                        totalHumans++;
                        if (data.game.readyNext && data.game.readyNext[key]) {
                            readyCount++;
                        }
                    }
                });
                
                if (totalHumans > 0) {
                    if (this.btnContinue.disabled) {
                        this.btnContinue.textContent = `Aguardando (${readyCount}/${totalHumans})`;
                    } else {
                        // User hasn't clicked yet, we can optionally show how many others clicked
                        this.btnContinue.textContent = `Continuar (${readyCount}/${totalHumans})`;
                    }
                    if (readyCount === totalHumans) {
                         this.hideResultOverlay();
                    }
                }
            }
        }
    }

    addLog(msg, type) {
        const li = document.createElement('li');
        li.textContent = msg;
        if (type === 'st') li.style.color = 'var(--super-trunfo-color)';
        if (type === 'tie') li.style.color = 'var(--error-color)';
        this.logList.appendChild(li);
        this.actionLog.scrollTop = this.actionLog.scrollHeight;
    }

    updateTurn(playerIndex) {
        this.processingRound = false;
        const p = this.game.players[playerIndex];
        const turnTextEl = document.getElementById('turn-text');
        
        const myId = this.game.isMultiplayer ? Network.playerId : 0;

        if (playerIndex === myId) {
            turnTextEl.textContent = '';
            this.currentPlayerName.textContent = 'Sua vez';
        } else {
            turnTextEl.textContent = 'Vez de ';
            this.currentPlayerName.textContent = p.name;
        }

        this.updateGameState();
    }

    updateGameState() {
        // Pool
        this.poolCount.textContent = this.game.pool.length;
        if (this.game.pool.length > 0) {
            this.poolIndicator.classList.remove('hide');
        } else {
            this.poolIndicator.classList.add('hide');
        }

        // Render card
        const myId = this.game.isMultiplayer ? Network.playerId : 0;
        const me = this.game.players[myId];
        this.p1CardContainer.innerHTML = '';
        if (me && me.deck.length > 0) {
            const isMyTurn = (this.game.currentPlayerIndex === myId && !me.isBot);
            const cardEl = this.createCardElement(me.deck[0], isMyTurn);
            if (!isMyTurn) {
                cardEl.classList.add('inactive-card');
            }
            this.p1CardContainer.appendChild(cardEl);
        } else {
            this.p1CardContainer.innerHTML = '<div class="st-card back"><p>Sem Cartas</p></div>';
        }

        // Snapshot previous positions for FLIP
        const oldPositions = {};
        if (this.playersContainer.children.length > 0) {
            Array.from(this.playersContainer.children).forEach(child => {
                const id = child.getAttribute('data-id');
                if (id !== null) {
                    oldPositions[id] = child.getBoundingClientRect();
                }
            });
        }

        // Render players array
        this.playersContainer.innerHTML = '';
        const sortedPlayers = [...this.game.players].sort((a, b) => b.deck.length - a.deck.length);

        sortedPlayers.forEach(player => {
            const div = document.createElement('div');
            div.className = `player-stat glass-panel ${player.deck.length === 0 ? 'eliminated' : ''} ${this.game.currentPlayerIndex === player.id ? 'highlight-box' : ''}`;
            div.setAttribute('data-id', player.id);

            const isMe = (player.id === (this.game.isMultiplayer ? Network.playerId : 0) && !player.isBot);
            const color = isMe ? 'var(--secondary-color)' : 'white';

            // Add a slight glow if it's their turn
            if (this.game.currentPlayerIndex === player.id) {
                div.style.boxShadow = `0 0 15px ${color}`;
            } else {
                div.style.boxShadow = 'none';
            }

            div.innerHTML = `
                <h4 style="color: ${color};">${isMe ? 'Você' : player.name}</h4>
                <span><span class="card-counter">${player.deck.length}</span> Cartas</span>
            `;
            this.playersContainer.appendChild(div);
        });

        // 2. Play FLIP animation
        requestAnimationFrame(() => {
            Array.from(this.playersContainer.children).forEach(child => {
                const id = child.getAttribute('data-id');
                const oldPos = oldPositions[id];
                if (oldPos) {
                    const newPos = child.getBoundingClientRect();
                    const deltaX = oldPos.left - newPos.left;
                    const deltaY = oldPos.top - newPos.top;

                    if (deltaX !== 0 || deltaY !== 0) {
                        child.style.transition = 'none';
                        child.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

                        requestAnimationFrame(() => {
                            child.style.transition = 'transform 0.5s ease, box-shadow 0.3s ease';
                            child.style.transform = 'translate(0, 0)';
                        });
                    }
                }
            });
        });
    }

    formatPropValue(value, propDef) {
        let formattedValue = (propDef.decimal !== undefined && propDef.decimal > 0)
            ? value.toFixed(propDef.decimal)
            : value;

        const prefix = propDef.prefix || '';
        const suffix = propDef.suffix || '';

        return `${prefix} ${formattedValue} ${suffix}`.trim().replace(/\s+/g, ' ');
    }

    createCardElement(card, interactive) {
        const div = document.createElement('div');
        div.className = `st-card ${card.superTrunfo ? 'super-trunfo' : ''}`;

        let propsHtml = '';
        this.game.activeDeck.properties.forEach(p => {
            propsHtml += `
                <div class="card-attr ${interactive ? 'selectable' : ''}" data-key="${p.key}">
                    <span class="attr-name">${p.label}</span>
                    <span class="attr-value">${this.formatPropValue(card.properties[p.key], p)}</span>
                </div>
            `;
        });

        div.innerHTML = `
            <div class="card-header">
                <span class="card-title">${card.name}</span>
                <span class="card-category">${card.category}</span>
            </div>
            <div class="card-image">
                <img src="${card.image}" onerror="this.onerror=null; this.outerHTML='<span>${card.superTrunfo ? '⚡ SUPER TRUNFO!' : '😀 Imagem'}</span>'">
            </div>
            <div class="card-body">
                ${propsHtml}
            </div>
        `;

        if (interactive) {
            const attrs = div.querySelectorAll('.selectable');
            attrs.forEach(attr => {
                attr.addEventListener('click', (e) => {
                    const myId = this.game.isMultiplayer ? Network.playerId : 0;
                    if (this.game.currentPlayerIndex !== myId || !this.game.isRunning || this.processingRound) return;

                    this.processingRound = true;
                    const clickedEl = e.currentTarget;
                    clickedEl.classList.add('selected');

                    const key = clickedEl.getAttribute('data-key');
                    const label = this.game.activeDeck.properties.find(pr => pr.key === key).label;
                    this.game.log(`Você escolheu a característica: ${label}`);

                    // Small delay to allow visual feedback
                    setTimeout(() => {
                        this.game.playTurn(key);
                    }, 500);
                });
            });
        }

        return div;
    }

    showEndScreen(winner) {
        this.showScreen(this.endScreen);
        const nameEl = document.getElementById('winner-name');
        const msgEl = document.getElementById('winner-msg');

        const myId = this.game.isMultiplayer ? Network.playerId : 0;
        const winnerPlayer = this.game.players[winner.id];
        const isMe = (winner.id === myId && winnerPlayer && !winnerPlayer.isBot);

        nameEl.textContent = isMe ? 'VITÓRIA!' : (winnerPlayer && winnerPlayer.isBot ? 'FIM DE JOGO!' : 'DERROTA!');
        nameEl.style.color = isMe ? 'var(--secondary-color)' : 'var(--error-color)';
        nameEl.style.textShadow = `0 0 10px ${isMe ? 'var(--secondary-color)' : 'var(--error-color)'}`;

        msgEl.textContent = isMe ? 'Você venceu o jogo!' : `${winner.name} dominou o jogo!`;
    }

    showRoundResult(data) {
        const { cards, propertyKey, winnerIndex, activePlayerIndex, tiedPlayers, isTie, isST } = data;
        const propData = this.game.activeDeck.properties.find(p => p.key === propertyKey);

        // Sort descending
        // If speed is 0 to 100, we might want ascending, but user said price and all descending.
        let sorted = [...cards].sort((a, b) => b.card.properties[propertyKey] - a.card.properties[propertyKey]);

        // If ST is involved, ST or -A is the real winner functionally, but visually we can just add a badge or leave the values as they are.

        this.resultList.innerHTML = '';
        sorted.forEach(entry => {
            const player = this.game.players[entry.playerIndex];
            const div = document.createElement('div');

            const isWinner = (entry.playerIndex === winnerIndex && !isTie);
            const isTied = (isTie && tiedPlayers.includes(entry.playerIndex));

            div.className = `result-item ${isWinner ? 'winner-item' : ''} ${isTied ? 'tie-item' : ''}`;

            let valText;
            if (entry.card.superTrunfo) {
                valText = 'SUPER';
            } else if (entry.card.category.endsWith('-A') && isST) {
                valText = 'A';
            } else {
                valText = this.formatPropValue(entry.card.properties[propertyKey], propData);
            }

            const myId = (this.game.isMultiplayer ? Network.playerId : 0);
            const isMe = (entry.playerIndex === myId && player && !player.isBot);
            const color = isMe ? 'var(--secondary-color)' : 'white';

            div.innerHTML = `
                <div style="display:flex; align-items:center; gap: 15px;">
                    <img src="${entry.card.image}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; flex-shrink: 0; background: #333;">
                    <div style="display: none; width: 40px; height: 40px; border-radius: 8px; flex-shrink: 0; background: rgba(255,255,255,0.1); align-items: center; justify-content: center; font-size: 1.2rem;">${entry.card.superTrunfo ? '⚡' : '😀'}</div>
                    <span class="result-item-name" style="margin: 0; color: ${color};">${isMe ? 'Você' : player.name} <br><small style="font-weight:normal;color:#ccc">${entry.card.name} (${entry.card.category})</small></span>
                </div>
                <span class="result-item-value" style="display:flex; align-items:center;">${valText}</span>
            `;
            this.resultList.appendChild(div);
        });

        if (isTie) {
            this.resultWinner.textContent = "Empate na Rodada!";
            this.resultWinner.style.color = 'var(--error-color)';
        } else {
            const activeName = this.game.players[activePlayerIndex].name;
            this.resultWinner.innerHTML = `<span style="color: white; font-weight: normal;">${activeName} selecionou</span> ${propData.label}`;
            this.resultWinner.style.color = 'var(--secondary-color)';
        }

        this.btnContinue.disabled = false;
        if (this.game.isMultiplayer) {
            // Count total active humans to initialize the counter
            let totalHumans = this.game.players.filter(p => !p.isBot).length; // initial estimate
            this.btnContinue.textContent = `Continuar (0/${totalHumans})`;
        } else {
            this.btnContinue.textContent = "Continuar";
        }

        this.resultOverlay.classList.remove('hide');
        setTimeout(() => this.resultOverlay.classList.add('active'), 50);
    }

    animateCardTransfer(won, isTie) {
        if (!this.p1CardContainer.firstElementChild) return;
        const cardEl = this.p1CardContainer.firstElementChild;

        if (isTie) {
            cardEl.classList.add('slide-right');
        } else if (!won) {
            cardEl.classList.add('slide-up');
        } else {
            cardEl.classList.add('slide-down');
        }
    }
}
