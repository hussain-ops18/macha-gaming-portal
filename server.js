const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = reportExpress = express();
const server = http.createServer(app);

const io = new Server(server, {
    pingTimeout: 30000,   
    pingInterval: 10000,  
    cors: { origin: "*" }
});

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
            console.log("💾 Permanent database records synchronized successfully.");
        }
    } catch (dbErr) {
        localUserDatabase = {};
    }
}

function commitActiveMemoryChangesToDiskStorage() {
    try {
        fs.writeFileSync(BACKUP_DB_FILE_PATH, JSON.stringify(localUserDatabase, null, 2), 'utf8');
    } catch (saveErr) {
        console.error("❌ Database sync failure!");
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
        res.json({ success: true, username: userRecord.rawUsername, wins: userRecord.matchWins, uid: userRecord.userUID });
    } catch (err) { res.status(500).json({ error: "Login error!" }); }
});

function shuffleArray(arr) {
    return arr.sort(() => 0.5 - Math.random());
}

function executeGameLogicEngine(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.players || room.players.length === 0) return;
    
    room.gameStarted = true; 
    room.drawings = {}; 
    room.votes = {};

    if (!room.usedWordsHistoryList) room.usedWordsHistoryList = [];

    const thingsCategoryPackageNode = wordsData.categories[0]; 
    let availableFreshWordsPool = thingsCategoryPackageNode.items.filter(word => !room.usedWordsHistoryList.includes(word));
    
    if (availableFreshWordsPool.length < 2) {
        room.usedWordsHistoryList = [];
        availableFreshWordsPool = [...thingsCategoryPackageNode.items];
    }

    let fullyShuffledWordTokens = shuffleArray([...availableFreshWordsPool]);
    const ultimateTeamTargetMainWord = fullyShuffledWordTokens[0];
    const ultimateSpyContextDecoyWord = fullyShuffledWordTokens[1];

    room.usedWordsHistoryList.push(ultimateTeamTargetMainWord);
    room.usedWordsHistoryList.push(ultimateSpyContextDecoyWord);

    let masterPoolOfPlayers = room.players.filter(p => p.isActive !== false);
    const totalLobbySizeCount = masterPoolOfPlayers.length;

    let assignedDetectivesCount = 2;
    if (totalLobbySizeCount <= 4) assignedDetectivesCount = 1; 

    const globalDetectivesIdsArray = [];
    for (let d = 0; d < assignedDetectivesCount; d++) {
        if(masterPoolOfPlayers[d]) globalDetectivesIdsArray.push(masterPoolOfPlayers[d].id);
    }
    const spyTargetObject = masterPoolOfPlayers[assignedDetectivesCount] || masterPoolOfPlayers[0];
    const globalSpyImpostorPlayerId = spyTargetObject.id;

    room.players.forEach((player) => {
        if (globalDetectivesIdsArray.includes(player.id)) {
            player.role = "Detective 🔍";
            player.word = "வார்த்தைகள் மறைக்கப்பட்டுள்ளது. வரைபட பலகையை கவனித்து துப்பு துலக்குங்கள்! 🧠";
        } else if (player.id === globalSpyImpostorPlayerId) {
            player.role = "Spy 🕵️‍♂️";
            player.word = ultimateSpyContextDecoyWord; 
        } else {
            player.role = "Team Member 🎨";
            player.word = ultimateTeamTargetMainWord; 
        }
        io.to(player.id).emit('assignRole', { role: player.role, word: player.word });
    });
}

// ================= MULTIPLAYER SOCKET NETWORK LOGIC MATRIX =================
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
                if (checkedRecordUidString === cleanTargetUid) { foundRealUserMatch = { name: structuralProfileRecordNode.rawUsername.toString().trim(), uid: checkedRecordUidString }; break; }
            }
        }
        if (foundRealUserMatch && foundRealUserMatch.name) { socket.emit('omnitrix_searchUidResultSuccess', foundRealUserMatch); } 
        else { socket.emit('omnitrix_searchUidResultFailure', `Apdi oru real player validation tag code (${cleanTargetUid}) database collections layout-le illai macha! 🔍❌`); }
    });

    // --- GAME 1 HIGH RESILIENCE PORTS ---
    socket.on('createNewRoomAction', ({ roomCode, username }) => {
        if (rooms && rooms[roomCode] && rooms[roomCode].players && rooms[roomCode].players.length > 0) {
            return socket.emit('roomAccessError', `டேய் மச்சா, இந்த ரூம் கோடு [${roomCode}] ஏற்கனவே ஆன்லைன்ல லைவா ஓடிக்கிட்டு இருக்குடா! வேற கஸ்டம் நம்பர் போடு! ❌`);
        }
        
        rooms[roomCode] = { players: [], gameStarted: false, adminId: socket.id, drawings: {}, votes: {} };
        rooms[roomCode].players.push({ id: socket.id, name: username, role: '', word: '', currentWins: 0, isActive: true });
        socket.join(roomCode); 
        socket.emit('roomAccessSuccess');
        io.to(roomCode).emit('roomData', { players: rooms[roomCode].players, adminId: rooms[roomCode].adminId });
        console.log(`🚀 Fresh Custom Room Created Successfully: [${roomCode}] by Admin: [${username}]`);
    });

    socket.on('joinExistingRoomAction', ({ roomCode, username }) => {
        const room = rooms[roomCode]; 
        if (!room) return socket.emit('roomAccessError', `Macha, intha code-la (${roomCode}) ippo active-ah endha room-me illai! 🛑`);
        
        room.players = room.players.filter(p => p.name.toLowerCase() !== username.toLowerCase() || p.isActive === true);
        room.players.push({ id: socket.id, name: username, role: '', word: '', currentWins: 0, isActive: true });
        socket.join(roomCode); 
        socket.emit('roomAccessSuccess');
        io.to(roomCode).emit('roomData', { players: room.players, adminId: room.adminId });
    });

    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode]; 
        if (!room) return;
        executeGameLogicEngine(roomCode);
    });

    socket.on('triggerPlayAgainAction', (roomCode) => {
        const room = rooms[roomCode]; if (!room) return;
        room.gameStarted = false; 
        io.to(roomCode).emit('reMatchInitiatedByAdmin');
        executeGameLogicEngine(roomCode);
    });

    socket.on('submitDrawing', ({ roomCode, drawingData }) => {
        const room = rooms[roomCode]; if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (player) room.drawings[player.id] = { name: player.name, data: drawingData, role: player.role };
        
        const requiredDrawersLobbyLimit = room.players.filter(p => (p.role.includes("Team Member") || p.role.includes("Spy")) && p.isActive !== false).length;
        if (Object.keys(room.drawings).length >= requiredDrawersLobbyLimit) {
            io.to(roomCode).emit('startVotingPhase', { drawings: room.drawings });
        }
    });

    socket.on('castVote', ({ roomCode, targetPlayerId }) => {
        const room = rooms[roomCode]; if (!room) return;
        if (!targetPlayerId || targetPlayerId === "null" || targetPlayerId === undefined) return; 
        
        room.votes[socket.id] = targetPlayerId;
        const detectivesActiveVotersCount = room.players.filter(p => p.role.includes("Detective") && p.isActive !== false).length;
        
        if (Object.keys(room.votes).length >= detectivesActiveVotersCount) {
            const spyObjectTargetProfileNode = room.players.find(p => p.role.includes("Spy"));
            let isSpyIdentifiedAndBlocked = true;

            const detectiveVotesValuesCollection = Object.values(room.votes);
            for (let v = 0; v < detectiveVotesValuesCollection.length; v++) {
                if (spyObjectTargetProfileNode && detectiveVotesValuesCollection[v] !== spyObjectTargetProfileNode.id) {
                    isSpyIdentifiedAndBlocked = false;
                    break;
                }
            }

            let finalMatchVerdictText = isSpyIdentifiedAndBlocked ? "Detectives Guess is Correct! Team Wins! 🏆🎉" : "Spy Escaped Detection Securely! The Spy Wins Solo! 🕵️‍♂️🔥";
            let winningGroupIdentifier = isSpyIdentifiedAndBlocked ? "Team_Group" : "Spy_Solo";

            room.players.forEach(p => {
                const dbUser = localUserDatabase[p.name.toString().trim().toLowerCase()];
                if (dbUser) {
                    if (winningGroupIdentifier === "Team_Group" && !p.role.includes("Spy")) dbUser.matchWins += 1;
                    else if (winningGroupIdentifier === "Spy_Solo" && p.role.includes("Spy")) dbUser.matchWins += 1;
                    p.currentWins = dbUser.matchWins;
                }
            });
            
            commitActiveMemoryChangesToDiskStorage();
            io.to(roomCode).emit('gameOver', { result: finalMatchVerdictText, spyName: spyObjectTargetProfileNode ? spyObjectTargetProfileNode.name : "Unknown", scores: room.players.map(p => ({ name: p.name, totalWins: p.currentWins || 0 })), adminId: room.adminId });
        }
    });

    // --- GAME 2 RESILIENT LOGIC PORTS ---
    socket.on('tp_createNewRoom', ({ roomCode, username }) => {
        if (takkunuRooms && takkunuRooms[roomCode] && takkunuRooms[roomCode].players && takkunuRooms[roomCode].players.length > 0) {
            return socket.emit('tp_roomError', `டேய் மச்சா, இந்த பஸ்ஸர் ரூம் கோடு [${roomCode}] ஏற்கனவே ஆன்லைன்ல லைவா ஓடுதுடா! வேற நம்பர் போடு! ❌`);
        }
        
        let pureFreshPool = [...connectWordsData.categories].sort(() => 0.5 - Math.random());
        takkunuRooms[roomCode] = { players: [], currentRound: 0, maxRounds: 10, adminId: socket.id, buzzerLockedBy: null, currentWordPair: null, wordsPool: pureFreshPool.slice(0, 10), roundTimeout: null };
        takkunuRooms[roomCode].players.push({ id: socket.id, name: username, score: 0, isActive: true });
        socket.join(roomCode); 
        socket.emit('tp_roomSuccess');
        io.to(roomCode).emit('tp_roomData', { players: takkunuRooms[roomCode].players, adminId: takkunuRooms[roomCode].adminId });
        console.log(`🚀 Custom Game-2 Room Created: [${roomCode}] by Admin: [${username}]`);
    });

    socket.on('tp_joinExistingRoom', ({ roomCode, username }) => {
        const room = takkunuRooms[roomCode]; 
        if (!room) return socket.emit('tp_roomError', `Macha, intha code-la (${roomCode}) ippo active buzzer room edhuvum illai! 🛑`);
        
        room.players = room.players.filter(p => p.name.toLowerCase() !== username.toLowerCase() || p.isActive === true);
        room.players.push({ id: socket.id, name: username, score: 0, isActive: true });
        socket.join(roomCode); 
        socket.emit('tp_roomSuccess');
        io.to(roomCode).emit('tp_roomData', { players: room.players, adminId: room.adminId });
    });

    function tp_startNextRoundEngine(roomCode) {
        const room = takkunuRooms[roomCode]; if (!room) return;
        room.buzzerLockedBy = null; room.currentRound += 1; if (room.roundTimeout) clearTimeout(room.roundTimeout);
        if (room.currentRound > room.maxRounds) { io.to(roomCode).emit('tp_gameFinished', { leaderboard: room.players.filter(p => p.isActive !== false).sort((a,b) => b.score - a.score) }); return; }
        room.currentWordPair = room.wordsPool[room.currentRound - 1];
        io.to(roomCode).emit('tp_nextRoundStarted', { round: room.currentRound, clues: room.currentWordPair.clues, type: room.currentWordPair.type });
        room.roundTimeout = setTimeout(() => { if (!room.buzzerLockedBy) { io.to(roomCode).emit('tp_roundTimeoutExpired', { actualAnswer: room.currentWordPair.answer, players: room.players }); setTimeout(() => { tp_startNextRoundEngine(roomCode); }, 4000); } }, 15000); 
    }
    socket.on('tp_startMatchTrigger', (roomCode) => { const room = takkunuRooms[roomCode]; if (!room) return; tp_startNextRoundEngine(roomCode); });
    socket.on('tp_buzzerPressed', (roomCode) => { const room = takkunuRooms[roomCode]; if (!room || room.buzzerLockedBy) return; if (room.roundTimeout) clearTimeout(room.roundTimeout); const player = room.players.find(p => p.id === socket.id); if (!player) return; room.buzzerLockedBy = socket.id; io.to(roomCode).emit('tp_buzzerLockedEvent', { winnerId: socket.id, winnerName: player.name }); });
    socket.on('tp_submitAnswer', ({ roomCode, submittedAnswer }) => { const room = takkunuRooms[roomCode]; if (!room || room.buzzerLockedBy !== socket.id) return; const player = room.players.find(p => p.id === socket.id); if (!player) return; let isCorrect = (submittedAnswer.toString().trim().toLowerCase() === room.currentWordPair.answer.toString().trim().toLowerCase()); if (isCorrect) player.score += 1; else player.score -= 1; io.to(roomCode).emit('tp_roundOutcome', { playerName: player.name, isCorrect, actualAnswer: room.currentWordPair.answer, players: room.players }); setTimeout(() => { tp_startNextRoundEngine(roomCode); }, 4000); });
    socket.on('tp_playAgainAction', (roomCode) => { const room = takkunuRooms[roomCode]; if (!room) return; room.currentRound = 0; let pureFreshPool = [...connectWordsData.categories].sort(() => 0.5 - Math.random()); room.wordsPool = pureFreshPool.slice(0, 10); room.players.forEach(p => p.score = 0); io.to(roomCode).emit('tp_roomData', { players: room.players, adminId: room.adminId }); tp_startNextRoundEngine(roomCode); });

    // ⚡ IRONCLAD ZERO-CANCELLATION DISCONNECT ENGINE: Fixed completely to prevent any hidden runtime crashes!
    socket.on('disconnect', () => {
        Object.keys(rooms).forEach(c => {
            const r = rooms[c];
            if (r && r.players) {
                let p = r.players.find(pl => pl.id === socket.id);
                if (p) {
                    p.isActive = false; 
                    setTimeout(() => { 
                        if (rooms && rooms[c] && rooms[c].players) {
                            let freshCheckPlayer = rooms[c].players.find(pl => pl.id === socket.id);
                            if (freshCheckPlayer && freshCheckPlayer.isActive === false) {
                                rooms[c].players = rooms[c].players.filter(pl => pl.id !== socket.id);
                                if (rooms[c].players.length === 0) delete rooms[c];
                                else io.to(c).emit('roomData', { players: rooms[c].players, adminId: rooms[c].adminId });
                            }
                        }
                    }, 15000);
                }
            }
        });
        
        Object.keys(takkunuRooms).forEach(code => {
            const r = takkunuRooms[code];
            if (r && r.players) {
                r.players = r.players.filter(p => p.id !== socket.id);
                if (r.players.length === 0) { if (r.roundTimeout) clearTimeout(r.roundTimeout); delete takkunuRooms[code]; } 
                else { if (r.adminId === socket.id) r.adminId = r.players[0].id; io.to(code).emit('tp_roomData', { players: r.players, adminId: r.adminId }); }
            }
        });
    });
});

server.listen(3000, () => console.log('Secure Standalone Cloud Portal running on port 3000! 🚀'));