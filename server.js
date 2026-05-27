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

let localUserDatabase = {}; // Standard bulletproof in-memory simulation account layer
const wordsData = JSON.parse(fs.readFileSync('words.json', 'utf8'));
let rooms = {}; 

// ================= AUTHENTICATION APIS (SIGNUP & LOGIN) =================
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const normalizedUser = username.trim().toLowerCase();
        if (localUserDatabase[normalizedUser]) return res.status(400).json({ error: "Intha peerla aal irukaanga macha!" });
        const hashedPassword = await bcrypt.hash(password, 10);
        localUserDatabase[normalizedUser] = { rawUsername: username.trim(), passwordHash: hashedPassword, matchWins: 14 };
        res.json({ success: true, username: localUserDatabase[normalizedUser].rawUsername, wins: localUserDatabase[normalizedUser].matchWins });
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
        res.json({ success: true, username: userRecord.rawUsername, wins: userRecord.matchWins });
    } catch (err) { res.status(500).json({ error: "Login error!" }); }
});

// ================= MULTIPLAYER CORE ROOM MATRIX SOCKET ENGINE =================
io.on('connection', (socket) => {

    // Scenario 1: Admin creating a brand new dynamic room code track
    socket.on('createNewRoomAction', ({ roomCode, username }) => {
        if (rooms[roomCode]) {
            socket.emit('roomAccessError', "Intha room code munnadiye yaaro create pannitaanga macha, vera code podu! ❌");
            return;
        }

        // Initialize fresh empty room parameters data blocks
        rooms[roomCode] = { players: [], gameStarted: false, adminId: socket.id, drawings: {}, votes: {} };
        rooms[roomCode].players.push({ id: socket.id, name: username, role: '', word: '' });
        
        socket.join(roomCode);
        socket.emit('roomAccessSuccess');
        io.to(roomCode).emit('roomData', { players: rooms[roomCode].players, adminId: rooms[roomCode].adminId });
    });

    // Scenario 2: Regular friends joining existing predefined blocks checks
    socket.on('joinExistingRoomAction', ({ roomCode, username }) => {
        const room = rooms[roomCode];
        
        if (!room) {
            socket.emit('roomAccessError', "Apdi oru room-e illa macha! Correct code-ah enter pannu, illa pudhu room create pannu! 🤯");
            return;
        }
        if (room.gameStarted) {
            socket.emit('roomAccessError', "Match munnadiye start aayiduchu macha, adutha round-la vaa! ⏱️");
            return;
        }

        room.players.push({ id: socket.id, name: username, role: '', word: '' });
        socket.join(roomCode);
        socket.emit('roomAccessSuccess');
        io.to(roomCode).emit('roomData', { players: room.players, adminId: room.adminId });
    });

    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (!room || room.adminId !== socket.id) return;
        room.gameStarted = true; room.drawings = {}; room.votes = {};
        const randomCategory = wordsData.categories[Math.floor(Math.random() * wordsData.categories.length)];
        const shuffledWords = randomCategory.words.sort(() => 0.5 - Math.random());
        
        let playersArray = [...room.players].sort(() => 0.5 - Math.random());
        const spyPlayer = playersArray[0];
        const detective1 = playersArray[1] || playersArray[0];
        const detective2 = playersArray[2] || playersArray[0];

        room.players.forEach(player => {
            if (player.id === spyPlayer.id) { player.role = "Spy 🕵️‍♂️"; player.word = shuffledWords[1]; }
            else if (player.id === detective1.id || player.id === detective2.id) { player.role = "Detective 🔍"; player.word = "Kandu Pidi Macha!"; }
            else { player.role = "Team Member 🎨"; player.word = shuffledWords[0]; }
            io.to(player.id).emit('assignRole', { role: player.role, word: player.word });
        });
    });

    socket.on('submitDrawing', ({ roomCode, drawingData }) => {
        const room = rooms[roomCode]; if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (player) room.drawings[player.id] = { name: player.name, data: drawingData, role: player.role };
        const totalDrawersCount = room.players.filter(p => !p.role.includes("Detective")).length;
        if (Object.keys(room.drawings).length >= totalDrawersCount) io.to(roomCode).emit('startVotingPhase', { drawings: room.drawings });
    });

    socket.on('castVote', ({ roomCode, targetPlayerId }) => {
        const room = rooms[roomCode]; if (!room) return;
        room.votes[socket.id] = targetPlayerId;
        const totalDetectives = room.players.filter(p => p.role.includes("Detective")).length;
        if (Object.keys(room.votes).length >= totalDetectives) {
            let gameResult = "Spy Escaped! Spy Wins! 🕵️‍♂️🔥";
            const spyObject = room.players.find(p => p.role.includes("Spy"));
            if(spyObject) {
                const spyVotesCount = Object.values(room.votes).filter(id => id === spyObject.id).length;
                if (spyVotesCount >= Math.ceil(totalDetectives / 2)) gameResult = "Detectives Found the Spy! Team Wins! 🏆🎉";
            }
            io.to(roomCode).emit('gameOver', { result: gameResult, spyName: spyObject ? spyObject.name : "Unknown" });
        }
    });

    socket.on('disconnect', () => {});
});

server.listen(3000, () => console.log('Secure Standalone Portal running on port 3000! 🚀'));