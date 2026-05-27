const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- PERMANENT HARD DATABASE DATA STORAGE MANAGER PIPELINE ---
const BACKUP_DB_FILE_PATH = 'user-profiles-persistent-db.json';
let localUserDatabase = {};

if (fs.existsSync(BACKUP_DB_FILE_PATH)) {
    try {
        const rawJsonStringData = fs.readFileSync(BACKUP_DB_FILE_PATH, 'utf8');
        if (rawJsonStringData && rawJsonStringData.trim() !== "") {
            localUserDatabase = JSON.parse(rawJsonStringData);
            console.log("💾 Permanent active records database successfully loaded on boot.");
        }
    } catch (dbErr) {
        console.log("⚠️ Fresh persistent database initialization triggered.");
        localUserDatabase = {};
    }
}

function commitActiveMemoryChangesToDiskStorage() {
    try {
        fs.writeFileSync(BACKUP_DB_FILE_PATH, JSON.stringify(localUserDatabase, null, 2), 'utf8');
    } catch (saveErr) {
        console.error("❌ Persistent storage writer module synchronization failure!");
    }
}

const wordsData = JSON.parse(fs.readFileSync('words.json', 'utf8'));
const connectWordsData = JSON.parse(fs.readFileSync('public/games/takkunu-paaru/words-db.json', 'utf8'));

let rooms = {}; 
let takkunuRooms = {}; 

// ================= AUTHENTICATION APIS =================
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const normalizedUser = username.trim().toLowerCase();
        if (localUserDatabase[normalizedUser]) return res.status(400).json({ error: "Intha peerla aal irukaanga macha!" });
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const generatedUid = "UID-" + Math.floor(1000 + Math.random() * 9000);
        localUserDatabase[normalizedUser] = { rawUsername: username.trim(), passwordHash: hashedPassword, matchWins: 0, userUID: generatedUid };
        
        commitActiveMemoryChangesToDiskStorage();
        res.json({ success: true, username: localUserDatabase[normalizedUser].rawUsername, wins: 0, uid: generatedUid });
    } catch (err) { res.status(500).json({ error: "Signup error!" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const normalizedUser = username.trim().toLowerCase();
        const userRecord = localUserDatabase[normalizedUser];
        if (!userRecord) return res.status(400).json({ error: "Intha user-e illaye macha!" });
        const isMatch = await bcrypt.compare(password, userRecord.passwordHash);
        if (!isMatch) return res.status(400).json({ error: "Password thappu! ❌" });
        
        if (!userRecord.userUID) {
            userRecord.userUID = "UID-" + Math.floor(1000 + Math.random() * 9000);
            commitActiveMemoryChangesToDiskStorage();
        }
        res.json({ success: true, username: userRecord.rawUsername, wins: userRecord.matchWins, uid: userRecord.userUID });
    } catch (err) { res.status(500).json({ error: "Login error!" }); }
});

// ================= 🎯 100% GUARANTEED REAL-TIME ROLE ASSIGNMENT GENERATOR ENGINE =================
function executeGameLogicEngine(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.players || room.players.length === 0) return;
    
    room.gameStarted = true; 
    room.drawings = {}; 
    room.votes = {};

    const randomCategory = wordsData.categories[Math.floor(Math.random() * wordsData.categories.length)];
    const shuffledWords = [...randomCategory.words].sort(() => 0.5 - Math.random());
    
    // Concrete absolute mathematical position pointer index allocation loop rules
    const totalActivePlayersInLobby = room.players.length;
    const computedRandomSpyIndexPointer = Math.floor(Math.random() * totalActivePlayersInLobby);

    console.log(`🎰 Room [${roomCode}] Core Engine Triggered: Total players = ${totalActivePlayersInLobby}. Assigned Spy Index offset position = ${computedRandomSpyIndexPointer}`);

    for (let currentOffset = 0; currentOffset < totalActivePlayersInLobby; currentOffset++) {
        const targetPlayerObjectRef = room.players[currentOffset];
        
        if (currentOffset === computedRandomSpyIndexPointer) {
            // Static index position explicitly matches condition checks profile variables allocation loop bounds
            targetPlayerObjectRef.role = "Spy 🕵️‍♂️";
            targetPlayerObjectRef.word = shuffledWords[1]; // Recovers dynamic decoy keyword text string array metrics
        } else {
            // Absolute fallback guarantees 100% exact roles segregation without reference mismatch leaks
            targetPlayerObjectRef.role = "Detective 🔍";
            targetPlayerObjectRef.word = "Kandu Pidi Macha! 🧠";
        }
        
        // Instant hardware signal dispatch pipeline trigger loop properties elements rules configuration
        io.to(targetPlayerObjectRef.id).emit('assignRole', { 
            role: targetPlayerObjectRef.role, 
            word: targetPlayerObjectRef.word 
        });
    }
}

// ================= MULTIPLAYER SOCKET NETWORK LOGIC CONTROL CENTER =================
io.on('connection', (socket) => {

    socket.on('omnitrix_searchAndVerifyUserUid', (requestedUidKey) => {
        if (!requestedUidKey) return;
        const cleanTargetUid = requestedUidKey.toString().trim().toUpperCase();
        let foundRealUserMatch = null;

        const dbUserKeysCollection = Object.keys(localUserDatabase);
        for (let i = 0; i < dbUserKeysCollection.length; i++) {
            const structuralProfileRecordNode = localUserDatabase[dbUserKeysCollection[i]];
            if (structuralProfileRecordNode && structuralProfileRecordNode.userUID) {
                const checkedRecordUidString = structuralProfileRecordNode.userUID.toString().trim().toUpperCase();
                if (checkedRecordUidString === cleanTargetUid) {
                    foundRealUserMatch = { name: structuralProfileRecordNode.rawUsername.toString().trim(), uid: checkedRecordUidString };
                    break;
                }
            }
        }
        if (foundRealUserMatch && foundRealUserMatch.name) {
            socket.emit('omnitrix_searchUidResultSuccess', foundRealUserMatch);
        } else {
            socket.emit('omnitrix_searchUidResultFailure', `Apdi oru real player validation tag code (${cleanTargetUid}) database collections layout-le illai macha! 🔍❌`);
        }
    });

    // --- GAME 1 NETWORKS CORE DRIVER PIPELINE ---
    socket.on('createNewRoomAction', ({ roomCode, username }) => {
        if (rooms[roomCode]) return socket.emit('roomAccessError', "Room already exists!");
        rooms[roomCode] = { players: [], gameStarted: false, adminId: socket.id, drawings: {}, votes: {} };
        rooms[roomCode].players.push({ id: socket.id, name: username, role: '', word: '', currentWins: 0 });
        socket.join(roomCode); socket.emit('roomAccessSuccess');
        io.to(roomCode).emit('roomData', { players: rooms[roomCode].players, adminId: rooms[roomCode].adminId });
    });

    socket.on('joinExistingRoomAction', ({ roomCode, username }) => {
        const room = rooms[roomCode]; if (!room || room.gameStarted) return socket.emit('roomAccessError', "Error joining room!");
        room.players.push({ id: socket.id, name: username, role: '', word: '', currentWins: 0 });
        socket.join(roomCode); socket.emit('roomAccessSuccess');
        io.to(roomCode).emit('roomData', { players: room.players, adminId: room.adminId });
    });

    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode]; if (!room || room.adminId !== socket.id) return;
        executeGameLogicEngine(roomCode);
    });

    socket.on('triggerPlayAgainAction', (roomCode) => {
        const room = rooms[roomCode]; if (!room || room.adminId !== socket.id) return;
        room.gameStarted = false; 
        io.to(roomCode).emit('reMatchInitiatedByAdmin');
        executeGameLogicEngine(roomCode);
    });

    socket.on('submitDrawing', ({ roomCode, drawingData }) => {
        const room = rooms[roomCode]; if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (player) room.drawings[player.id] = { name: player.name, data: drawingData, role: player.role };
        
        const totalDrawersCount = room.players.filter(p => !p.role.includes("Detective")).length;
        if (Object.keys(room.drawings).length >= totalDrawersCount) {
            io.to(roomCode).emit('startVotingPhase', { drawings: room.drawings });
        }
    });

    socket.on('castVote', ({ roomCode, targetPlayerId }) => {
        const room = rooms[roomCode]; if (!room) return;
        room.votes[socket.id] = targetPlayerId;
        
        if (Object.keys(room.votes).length >= room.players.length) {
            let gameResult = "Spy Escaped! Spy Wins! 🕵️‍♂️🔥"; 
            let winningRole = "Spy 🕵️‍♂️";
            
            const spyObject = room.players.find(p => p.role.includes("Spy"));
            const totalVotersCount = room.players.length;

            if (spyObject) {
                const spyVotesCount = Object.values(room.votes).filter(id => id === spyObject.id).length;
                if (spyVotesCount >= Math.ceil(totalVotersCount / 2)) {
                    gameResult = "Detectives Found the Spy! Team Wins! 🏆🎉"; 
                    winningRole = "Detective / Team";
                }
            }

            room.players.forEach(p => {
                const dbUser = localUserDatabase[p.name.toString().trim().toLowerCase()];
                if (dbUser) {
                    if (winningRole === "Spy 🕵️‍♂️" && p.role.includes("Spy")) {
                        dbUser.matchWins += 1;
                    } else if (winningRole === "Detective / Team" && !p.role.includes("Spy")) {
                        dbUser.matchWins += 1;
                    }
                    p.currentWins = dbUser.matchWins;
                }
            });
            
            commitActiveMemoryChangesToDiskStorage();
            
            io.to(roomCode).emit('gameOver', { 
                result: gameResult, 
                spyName: spyObject ? spyObject.name : "Unknown", 
                scores: room.players.map(p => ({ name: p.name, totalWins: p.currentWins || 0 })), 
                adminId: room.adminId 
            });
        }
    });

    // --- GAME 2 LOGIC ENGINE ---
    socket.on('tp_createNewRoom', ({ roomCode, username }) => {
        if (takkunuRooms[roomCode]) return socket.emit('tp_roomError', "Intha code-la munnadiye room iruku macha! ❌");
        let pureFreshPool = [...connectWordsData.categories].sort(() => 0.5 - Math.random());
        takkunuRooms[roomCode] = { players: [], currentRound: 0, maxRounds: 10, adminId: socket.id, buzzerLockedBy: null, currentWordPair: null, wordsPool: pureFreshPool.slice(0, 10), roundTimeout: null };
        takkunuRooms[roomCode].players.push({ id: socket.id, name: username, score: 0 });
        socket.join(roomCode); socket.emit('tp_roomSuccess');
        io.to(roomCode).emit('tp_roomData', { players: takkunuRooms[roomCode].players, adminId: takkunuRooms[roomCode].adminId });
    });
    socket.on('tp_joinExistingRoom', ({ roomCode, username }) => {
        const room = takkunuRooms[roomCode]; if (!room) return socket.emit('tp_roomError', "Apdi oru room-e illa macha! 🤯");
        room.players.push({ id: socket.id, name: username, score: 0 });
        socket.join(roomCode); socket.emit('tp_roomSuccess');
        io.to(roomCode).emit('tp_roomData', { players: room.players, adminId: room.adminId });
    });
    function tp_startNextRoundEngine(roomCode) {
        const room = takkunuRooms[roomCode]; if (!room) return;
        room.buzzerLockedBy = null; room.currentRound += 1; if (room.roundTimeout) clearTimeout(room.roundTimeout);
        if (room.currentRound > room.maxRounds) { io.to(roomCode).emit('tp_gameFinished', { leaderboard: [...room.players].sort((a,b) => b.score - a.score) }); return; }
        room.currentWordPair = room.wordsPool[room.currentRound - 1];
        io.to(roomCode).emit('tp_nextRoundStarted', { round: room.currentRound, clues: room.currentWordPair.clues, type: room.currentWordPair.type });
        room.roundTimeout = setTimeout(() => { if (!room.buzzerLockedBy) { io.to(roomCode).emit('tp_roundTimeoutExpired', { actualAnswer: room.currentWordPair.answer, players: room.players }); setTimeout(() => { tp_startNextRoundEngine(roomCode); }, 4000); } }, 15000); 
    }
    socket.on('tp_startMatchTrigger', (roomCode) => { const room = takkunuRooms[roomCode]; if (!room || room.adminId !== socket.id) return; tp_startNextRoundEngine(roomCode); });
    socket.on('tp_buzzerPressed', (roomCode) => { const room = takkunuRooms[roomCode]; if (!room || room.buzzerLockedBy) return; if (room.roundTimeout) clearTimeout(room.roundTimeout); const player = room.players.find(p => p.id === socket.id); if (!player) return; room.buzzerLockedBy = socket.id; io.to(roomCode).emit('tp_buzzerLockedEvent', { winnerId: socket.id, winnerName: player.name }); });
    socket.on('tp_submitAnswer', ({ roomCode, submittedAnswer }) => { const room = takkunuRooms[roomCode]; if (!room || room.buzzerLockedBy !== socket.id) return; const player = room.players.find(p => p.id === socket.id); if (!player) return; let isCorrect = (submittedAnswer.toString().trim().toLowerCase() === room.currentWordPair.answer.toString().trim().toLowerCase()); if (isCorrect) player.score += 1; else player.score -= 1; io.to(roomCode).emit('tp_roundOutcome', { playerName: player.name, isCorrect, actualAnswer: room.currentWordPair.answer, players: room.players }); setTimeout(() => { tp_startNextRoundEngine(roomCode); }, 4000); });
    socket.on('tp_playAgainAction', (roomCode) => { const room = takkunuRooms[roomCode]; if (!room || room.adminId !== socket.id) return; room.currentRound = 0; let pureFreshPool = [...connectWordsData.categories].sort(() => 0.5 - Math.random()); room.wordsPool = pureFreshPool.slice(0, 10); room.players.forEach(p => p.score = 0); io.to(roomCode).emit('tp_roomData', { players: room.players, adminId: room.adminId }); tp_startNextRoundEngine(roomCode); });

    socket.on('disconnect', () => {
        Object.keys(rooms).forEach(c => { rooms[c].players = rooms[c].players.filter(p => p.id !== socket.id); if (rooms[c].players.length === 0) delete rooms[c]; });
        Object.keys(takkunuRooms).forEach(code => { const r = takkunuRooms[code]; r.players = r.players.filter(p => p.id !== socket.id); if (r.players.length === 0) { if (r.roundTimeout) clearTimeout(r.roundTimeout); delete takkunuRooms[code]; } else { if (r.adminId === socket.id) r.adminId = r.players[0].id; io.to(code).emit('tp_roomData', { players: r.players, adminId: r.adminId }); } });
    });
});

server.listen(3000, () => console.log('Secure Standalone Portal running on port 3000! 🚀'));