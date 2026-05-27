const socket = io();

const lobbyBox = document.getElementById('lobby-box');
const gameArea = document.getElementById('game-area');
const votingArea = document.getElementById('voting-area');
const resultArea = document.getElementById('result-area');

const urlParams = new URLSearchParams(window.location.search);
const dashboardLoggedUser = urlParams.get('user') || "Macha_" + Math.floor(Math.random() * 1000);

const roomCodeInput = document.getElementById('roomCode');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const playerListDisplay = document.getElementById('player-list');
const drawingsGrid = document.getElementById('drawings-grid');

document.querySelector('#lobby-box p').innerHTML = `Welcome <b>${dashboardLoggedUser}</b>! Enter choices options details below:`;

const canvas = document.getElementById('sketchPad');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
let isDrawing = false;
let globalTimeOver = false;

ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.strokeStyle = '#162447';

let currentRoom = "";
let myPersonalRole = "";
let timerInterval = null;

createBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toLowerCase();
    if (!roomCode) { alert("Room Code typed pannu macha!"); return; }
    currentRoom = roomCode;
    socket.emit('createNewRoomAction', { roomCode, username: dashboardLoggedUser });
});

joinBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toLowerCase();
    if (!roomCode) { alert("Room code fill pannu macha!"); return; }
    currentRoom = roomCode;
    socket.emit('joinExistingRoomAction', { roomCode, username: dashboardLoggedUser });
});

socket.on('roomAccessError', (msg) => { alert(msg); });
socket.on('roomAccessSuccess', () => { lobbyBox.style.display = "none"; gameArea.style.display = "block"; });

startBtn.addEventListener('click', () => { socket.emit('startGame', currentRoom); });

// Trigger rematch event to server when admin hits Play Again
playAgainBtn.addEventListener('click', () => { socket.emit('triggerPlayAgainAction', currentRoom); });

socket.on('roomData', ({ players, adminId }) => {
    playerListDisplay.innerText = players.map(p => p.name).join(', ');
    if (socket.id === adminId) { startBtn.style.display = "inline-block"; }
});

socket.on('assignRole', ({ role, word }) => {
    myPersonalRole = role;
    document.getElementById('my-role').innerText = role;
    document.getElementById('my-word').innerText = word;
    if (role.includes("Detective")) {
        document.getElementById('canvas-container').style.display = "none";
    } else {
        document.getElementById('canvas-container').style.display = "block";
    }
    startTimerCount(60); 
});

function startTimerCount(seconds) {
    let timeLeft = seconds;
    const timerDisplay = document.getElementById('timer-display');
    globalTimeOver = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--; timerDisplay.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval); timerDisplay.innerText = "Time Over! 🛑";
            if (!myPersonalRole.includes("Detective")) {
                socket.emit('submitDrawing', { roomCode: currentRoom, drawingData: canvas.toDataURL() });
            }
            globalTimeOver = true;
        }
    }, 1000);
}

socket.on('startVotingPhase', ({ drawings }) => {
    clearInterval(timerInterval); gameArea.style.display = "none"; votingArea.style.display = "block"; drawingsGrid.innerHTML = ""; 
    Object.keys(drawings).forEach(playerId => {
        const item = drawings[playerId];
        const card = document.createElement('div'); card.className = "grid-item";
        card.innerHTML = `<h3>Sketch by: ${item.name}</h3><img src="${item.data}">`;
        if (myPersonalRole.includes("Detective")) {
            const voteBtn = document.createElement('button'); voteBtn.innerText = `Vote ${item.name} as Spy! 🕵️‍♂️`;
            voteBtn.style.backgroundColor = "#e67e22";
            voteBtn.addEventListener('click', () => {
                socket.emit('castVote', { roomCode: currentRoom, targetPlayerId: playerId });
                votingArea.innerHTML = "<h3>Vote casted successfully! Ready for scoreboard... ⏱️</h3>";
            });
            card.appendChild(voteBtn);
        }
        drawingsGrid.appendChild(card);
    });
});

socket.on('gameOver', ({ result, spyName, scores, adminId }) => {
    votingArea.style.display = "none"; resultArea.style.display = "block";
    document.getElementById('game-outcome').innerText = result;
    document.getElementById('reveal-spy-name').innerText = spyName;
    if(scores) {
        const myRecord = scores.find(s => s.name === dashboardLoggedUser);
        if(myRecord) localStorage.setItem('machaWins', myRecord.totalWins);
    }
    
    // Shows Play Again button only if the current player is the room admin
    if (socket.id === adminId) {
        playAgainBtn.style.display = "inline-block";
    } else {
        playAgainBtn.style.display = "none";
    }
});

// Resets screen parameters flawlessly when admin initiates a rematch round
socket.on('reMatchInitiatedByAdmin', () => {
    resultArea.style.display = "none";
    votingArea.style.display = "none";
    gameArea.style.display = "block";
});

// ================= HARMONIZED RESPONSIVE TOUCH COORDINATE TRANSLATOR ENGINE =================
function getPreciseEventPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

canvas.addEventListener('mousedown', (e) => {
    if (globalTimeOver || myPersonalRole.includes("Detective")) return;
    isDrawing = true; const pos = getPreciseEventPos(e.clientX, e.clientY);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
});
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || globalTimeOver || myPersonalRole.includes("Detective")) return;
    const pos = getPreciseEventPos(e.clientX, e.clientY); ctx.lineTo(pos.x, pos.y); ctx.stroke();
});
canvas.addEventListener('mouseup', () => isDrawing = false);

canvas.addEventListener('touchstart', (e) => {
    if (globalTimeOver || myPersonalRole.includes("Detective")) return;
    isDrawing = true; const touch = e.touches[0];
    const pos = getPreciseEventPos(touch.clientX, touch.clientY); e.preventDefault();
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!isDrawing || globalTimeOver || myPersonalRole.includes("Detective")) return;
    const touch = e.touches[0];
    const pos = getPreciseEventPos(touch.clientX, touch.clientY); e.preventDefault();
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
}, { passive: false });

canvas.addEventListener('touchend', () => isDrawing = false);

clearBtn.addEventListener('click', () => { if (!globalTimeOver) ctx.clearRect(0, 0, canvas.width, canvas.height); });