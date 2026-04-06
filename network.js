const firebaseConfig = {
    apiKey: "AIzaSyB1yLU4r_wMcb1JgEebEOhK5gTavNZbCqk",
    authDomain: "super-duelo.firebaseapp.com",
    databaseURL: "https://super-duelo-default-rtdb.firebaseio.com",
    projectId: "super-duelo",
    storageBucket: "super-duelo.firebasestorage.app",
    messagingSenderId: "1061627555187",
    appId: "1:1061627555187:web:0a14d72102137a39906906"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const Network = {
    roomId: null,
    playerId: null, // 0 for host, 1+ for guests
    isHost: false,
    isConnected: false,

    // Creates a new room and joins as host
    createRoom: function(config, callback) {
        this.roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.isHost = true;
        this.playerId = 0;
        
        let initialPlayers = {};
        initialPlayers[0] = { name: config.hostName, isBot: false, isReady: true, connected: true };
        
        db.ref('rooms/' + this.roomId).set({
            config: {
                humans: config.humans,
                bots: config.bots,
                deckKey: config.deckKey,
                totalPlayers: config.humans + config.bots
            },
            state: 'lobby',
            players: initialPlayers
        }).then(() => {
            this.setupPresence();
            this.listenRoom();
            if(callback) callback(this.roomId);
        });
    },

    // Join an existing room
    joinRoom: function(roomId, name, callback, onError) {
        this.roomId = roomId.toUpperCase();
        this.isHost = false;
        
        db.ref('rooms/' + this.roomId).once('value').then(snapshot => {
            const room = snapshot.val();
            if (!room) {
                if (onError) onError('Sala não encontrada.');
                return;
            }
            if (room.state !== 'lobby') {
                if (onError) onError('O jogo já começou ou foi encerrado.');
                return;
            }
            
            // Find an empty slot
            let myId = -1;
            for (let i = 1; i < room.config.humans; i++) {
                if (!room.players || !room.players[i]) {
                    myId = i;
                    break;
                }
            }
            
            if (myId === -1) {
                if (onError) onError('A sala está cheia!');
                return;
            }
            
            this.playerId = myId;
            db.ref('rooms/' + this.roomId + '/players/' + myId).set({
                name: name,
                isBot: false,
                isReady: true,
                connected: true
            }).then(() => {
                this.setupPresence();
                this.listenRoom();
                if(callback) callback(this.roomId);
            });
        });
    },

    setupPresence: function() {
        const myConRef = db.ref(`rooms/${this.roomId}/players/${this.playerId}/connected`);
        const amOnline = db.ref('.info/connected');
        
        amOnline.on('value', snapshot => {
            if (snapshot.val()) {
                myConRef.onDisconnect().set(false);
                myConRef.set(true);
            }
        });
    },

    listenRoom: function() {
        if(this.roomRef) {
            this.roomRef.off();
        }
        this.roomRef = db.ref('rooms/' + this.roomId);
        this.roomRef.on('value', snapshot => {
            const data = snapshot.val();
            if (window.onNetworkUpdate && data) {
                window.onNetworkUpdate(data);
            }
        });

        // Listen for specific Host triggers
        if (!this.isHost) {
            db.ref('rooms/' + this.roomId + '/game/turnAction').on('value', snap => {
                const action = snap.val();
                if (action && window.onGuestTurnAction) window.onGuestTurnAction(action);
            });
        } else {
            // Host listens for guest turn selections
            db.ref('rooms/' + this.roomId + '/guestAction').on('value', snap => {
                const action = snap.val();
                if (action && window.onHostReceiveGuestAction) {
                    window.onHostReceiveGuestAction(action);
                }
            });
        }
    },

    // Host commits game state (decks, pool, active player)
    updateGameState: function(gameData) {
        if (!this.isHost) return;
        return db.ref('rooms/' + this.roomId + '/game').update(gameData);
    },

    // Host starts game
    startGame: function(initialGameData) {
        if (!this.isHost) return;
        return db.ref('rooms/' + this.roomId).update({
            state: 'playing',
            game: initialGameData
        });
    },

    // Guest sends their selected property
    sendAction: function(propertyKey) {
        return db.ref('rooms/' + this.roomId + '/guestAction').set({
            playerIndex: this.playerId,
            propertyKey: propertyKey,
            t: Date.now()
        });
    },
    
    // Anyone marks themselves as ready for the next round
    setReadyNextRound: function(isReady) {
        return db.ref('rooms/' + this.roomId + '/game/readyNext/' + this.playerId).set(isReady);
    },
    
    // Host sets a player as bot if disconnected
    setPlayerAsBot: function(playerId, name) {
        if (!this.isHost) return;
        return db.ref('rooms/' + this.roomId + '/players/' + playerId).update({
            isBot: true,
            name: name + " (Bot)"
        });
    }
};
