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
const playerListDisplay = document.getElementById('player-list');
const drawingsGrid = document.getElementById('drawings-grid');

document.querySelector('#lobby-box p').innerHTML = `Welcome <b>${dashboardLoggedUser}</b>! Action choice validation below:`;

// Canvas Configurations Parameters
const canvas = document.getElementById('sketchPad');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
let isDrawing = false;
let globalTimeOver = false;

ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.strokeStyle = '#2c3e50';

let currentRoom = "";
let myPersonalRole = "";
let timerInterval = null;

// ACTION 1: Host creates a fresh room session
createBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toLowerCase();
    if (!roomCode) { alert("Room Code-ah typed panni create pannu macha!"); return; }
    currentRoom = roomCode;
    socket.emit('createNewRoomAction', { roomCode, username: dashboardLoggedUser });
});

// ACTION 2: Friends join an existing validation room session
joinBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toLowerCase();
    if (!roomCode) { alert("Room code pottu ulla vaa macha!"); return; }
    currentRoom = roomCode;
    socket.emit('joinExistingRoomAction', { roomCode, username: dashboardLoggedUser });
});

// Server rejection feedback handler loop
socket.on('roomAccessError', (errorMessage) => {
    alert(errorMessage);
});

// Access granted transition script logic
socket.on('roomAccessSuccess', () => {
    lobbyBox.style.display = "none";
    gameArea.style.display = "block";
});

startBtn.addEventListener('click', () => {
    socket.emit('startGame', currentRoom);
});

socket.on('roomData', ({ players, adminId }) => {
    const names = players.map(p => p.name).join(', ');
    playerListDisplay.innerText = names;
    if (socket.id === adminId) { startBtn.style.display = "inline-block"; }
});

socket.on('assignRole', ({ role, word }) => {
    myPersonalRole = role;
    document.getElementById('my-role').innerText = role;
    document.getElementById('my-word').innerText = word;
    if (role.includes("Detective")) {
        document.getElementById('canvas-container').style.display = "none";
        document.getElementById('my-word').innerText = "Observe the canvas grid carefully macha!";
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
                const drawingDataURL = canvas.toDataURL();
                socket.emit('submitDrawing', { roomCode: currentRoom, drawingData: drawingDataURL });
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
                votingArea.innerHTML = "<h3>Vote casted successfully! ⏱️</h3>";
            });
            card.appendChild(voteBtn);
        }
        drawingsGrid.appendChild(card);
    });
});

socket.on('gameOver', ({ result, spyName }) => {
    votingArea.style.display = "none"; resultArea.style.display = "block";
    document.getElementById('game-outcome').innerText = result;
    document.getElementById('reveal-spy-name').innerText = spyName;
});

canvas.addEventListener('mousedown', (e) => { if (globalTimeOver || myPersonalRole.includes("Detective")) return; isDrawing = true; draw(e); });
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => { isDrawing = false; ctx.beginPath(); });
canvas.addEventListener('mouseout', () => { isDrawing = false; ctx.beginPath(); });
function draw(e) {
    if (globalTimeOver || !isDrawing || myPersonalRole.includes("Detective")) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}
clearBtn.addEventListener('click', () => { if (!globalTimeOver) ctx.clearRect(0, 0, canvas.width, canvas.height); });