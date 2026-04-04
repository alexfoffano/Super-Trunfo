class UI {
    constructor(game) {
        this.game = game;
        
        // Screens
        this.titleScreen = document.getElementById('title-screen');
        this.setupScreen = document.getElementById('setup-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.endScreen = document.getElementById('end-screen');

        // Buttons
        this.btnPlay = document.getElementById('btn-play');
        this.btnStart = document.getElementById('btn-start');
        this.btnRestart = document.getElementById('btn-restart');
        
        // Form
        this.playerCount = document.getElementById('player-count');
        this.deckSelect = document.getElementById('deck-select');

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
        this.btnPlay.addEventListener('click', () => this.showScreen(this.setupScreen));
        
        this.btnStart.addEventListener('click', () => {
            let count = parseInt(this.playerCount.value);
            let deckKey = this.deckSelect.value;
            if(count < 2 || count > 8) count = 2;
            this.showScreen(this.gameScreen);
            this.logList.innerHTML = '';
            this.game.init(count, deckKey);
        });

        this.btnRestart.addEventListener('click', () => {
            this.showScreen(this.setupScreen);
        });

        this.btnContinue.addEventListener('click', () => {
            this.resultOverlay.classList.remove('active');
            setTimeout(() => this.resultOverlay.classList.add('hide'), 300);
            if (this.game.resolveContinue) {
                this.game.resolveContinue();
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

    showScreen(screenObj) {
        [this.titleScreen, this.setupScreen, this.gameScreen, this.endScreen].forEach(s => {
            s.classList.remove('active');
            s.classList.add('hide');
        });
        screenObj.classList.remove('hide');
        setTimeout(() => screenObj.classList.add('active'), 100);
    }

    addLog(msg, type) {
        const li = document.createElement('li');
        li.textContent = msg;
        if(type === 'st') li.style.color = 'var(--super-trunfo-color)';
        if(type === 'tie') li.style.color = 'var(--error-color)';
        this.logList.appendChild(li);
        this.actionLog.scrollTop = this.actionLog.scrollHeight;
    }

    updateTurn(playerIndex) {
        this.processingRound = false;
        const p = this.game.players[playerIndex];
        const turnTextEl = document.getElementById('turn-text');
        
        if (playerIndex === 0) {
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
        const p1 = this.game.players[0];
        this.p1CardContainer.innerHTML = '';
        if (p1.deck.length > 0) {
            const isUserTurn = (this.game.currentPlayerIndex === 0);
            const cardEl = this.createCardElement(p1.deck[0], isUserTurn);
            if (!isUserTurn) {
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
            
            const isUser = (player.id === 0);
            const color = isUser ? 'var(--secondary-color)' : 'white';

            // Add a slight glow if it's their turn
            if(this.game.currentPlayerIndex === player.id) {
                div.style.boxShadow = `0 0 15px ${color}`;
            } else {
                div.style.boxShadow = 'none';
            }

            div.innerHTML = `
                <h4 style="color: ${color};">${isUser ? 'Você' : player.name}</h4>
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
                <img src="${card.image}" onerror="this.onerror=null; this.outerHTML='${card.superTrunfo ? '⚡ SUPER TRUNFO!' : '😀 Imagem'}'" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
            </div>
            <div class="card-body">
                ${propsHtml}
            </div>
        `;

        if (interactive) {
            const attrs = div.querySelectorAll('.selectable');
            attrs.forEach(attr => {
                attr.addEventListener('click', (e) => {
                    if(this.game.currentPlayerIndex !== 0 || !this.game.isRunning || this.processingRound) return;
                    
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
        
        nameEl.textContent = winner.id === 0 ? 'VITÓRIA!' : 'DERROTA!';
        nameEl.style.color = winner.id === 0 ? 'var(--secondary-color)' : 'var(--error-color)';
        nameEl.style.textShadow = `0 0 10px ${winner.id === 0 ? 'var(--secondary-color)' : 'var(--error-color)'}`;
        
        msgEl.textContent = winner.id === 0 ? 'Você venceu o jogo de Super Trunfo!' : `${winner.name} dominou o jogo!`;
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
            
            let valText = this.formatPropValue(entry.card.properties[propertyKey], propData);
            if (entry.card.superTrunfo) valText += ' (ST)';
            else if (entry.card.category.endsWith('-A') && isST) valText += ' (-A)';

            const isUser = (entry.playerIndex === 0);
            const nameColor = isUser ? 'var(--secondary-color)' : 'white';

            div.innerHTML = `
                <div style="display:flex; align-items:center; gap: 15px;">
                    <img src="${entry.card.image}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; flex-shrink: 0; background: #333;">
                    <div style="display: none; width: 40px; height: 40px; border-radius: 8px; flex-shrink: 0; background: rgba(255,255,255,0.1); align-items: center; justify-content: center; font-size: 1.2rem;">${entry.card.superTrunfo ? '⚡' : '😀'}</div>
                    <span class="result-item-name" style="margin: 0; color: ${nameColor};">${isUser ? 'Você' : player.name} <br><small style="font-weight:normal;color:#ccc">${entry.card.name} (${entry.card.category})</small></span>
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
