const socket = io();

const lobbyBox = document.getElementById('lobby-box');
const gameArea = document.getElementById('game-area');
const buzzerInputPad = document.getElementById('buzzer-input-pad');
const roundFeedbackScreen = document.getElementById('round-feedback-screen');
const finalLeaderboardScreen = document.getElementById('final-leaderboard-screen');

const urlParams = new URLSearchParams(window.location.search);
const dashboardUser = urlParams.get('user') || "Player_" + Math.floor(Math.random() * 1000);

const roomCodeInput = document.getElementById('roomCode');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const buzzerTriggerBtn = document.getElementById('buzzerTriggerBtn');
const submitTypedAnswerBtn = document.getElementById('submitTypedAnswerBtn');
const textAnswerField = document.getElementById('textAnswerField');
const micCaptureBtn = document.getElementById('micCaptureBtn');
const playAgainMasterBtn = document.getElementById('playAgainMasterBtn');

document.getElementById('welcome-label').innerHTML = `Welcome <b>${dashboardUser}</b>! Ready to buzz?`;

let currentRoom = ""; let currentAdminId = ""; let totalMatchRounds = 10;
let uiTimerInterval = null;

createBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toLowerCase(); if (!code) return;
    currentRoom = code; socket.emit('tp_createNewRoom', { roomCode: code, username: dashboardUser });
});

joinBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toLowerCase(); if (!code) return;
    currentRoom = code; socket.emit('tp_joinExistingRoom', { roomCode: code, username: dashboardUser });
});

socket.on('tp_roomError', (msg) => alert(msg));
socket.on('tp_roomSuccess', () => { lobbyBox.style.display = "none"; gameArea.style.display = "block"; });

startBtn.addEventListener('click', () => { socket.emit('tp_startMatchTrigger', currentRoom); });
playAgainMasterBtn.addEventListener('click', () => { socket.emit('tp_playAgainAction', currentRoom); });

socket.on('tp_roomData', ({ players, adminId }) => {
    currentAdminId = adminId;
    document.getElementById('players-list-display').innerText = players.map(p => p.name).join(', ');
    updateLiveScorecardDisplay(players);
    if (socket.id === adminId) startBtn.style.display = "inline-block";
});

function updateLiveScorecardDisplay(playersList) {
    document.getElementById('scorecard-elements-list').innerHTML = playersList.map(p => `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #ff007f; padding:4px 0;"><span>⚡ ${p.name.toUpperCase()}</span> <span style="color:#00f0ff;">${p.score} PX</span></div>`).join('');
}

function startUiCountdownTracker(seconds) {
    let clock = seconds; const disp = document.getElementById('timer-display'); disp.innerText = clock;
    clearInterval(uiTimerInterval);
    uiTimerInterval = setInterval(() => {
        clock--; disp.innerText = clock;
        if (clock <= 0) clearInterval(uiTimerInterval);
    }, 1000);
}

socket.on('tp_nextRoundStarted', ({ round, clues, type }) => {
    roundFeedbackScreen.style.display = "none"; finalLeaderboardScreen.style.display = "none";
    gameArea.style.display = "block"; buzzerInputPad.style.display = "none"; textAnswerField.value = "";
    
    document.getElementById('round-title-pill').innerText = `ROUND MATRIX: ${round} / ${totalMatchRounds}`;
    document.getElementById('category-display').innerText = type;

    const cluesContainer = document.getElementById('clues-container-layout');
    cluesContainer.innerHTML = clues.map(clue => `<div class="neon-clue">${clue}</div>`).join(' <span style="font-size:2rem; font-weight:bold; color:#00f0ff;">+</span> ');

    buzzerTriggerBtn.disabled = false;
    buzzerTriggerBtn.innerText = "BUZZ 🚨";
    startUiCountdownTracker(15); // Starts local 15s visual ticker sync
});

buzzerTriggerBtn.addEventListener('click', () => { socket.emit('tp_buzzerPressed', currentRoom); });

socket.on('tp_buzzerLockedEvent', ({ winnerId, winnerName }) => {
    clearInterval(uiTimerInterval); // Freeze stopwatch immediately on buzzer strike
    buzzerTriggerBtn.disabled = true; buzzerTriggerBtn.innerText = `LOCKED: ${winnerName.toUpperCase()} 🔒`;

    if (socket.id === winnerId) {
        buzzerInputPad.style.display = "block"; document.getElementById('lock-winner-label').innerText = "You"; textAnswerField.focus();
    } else {
        buzzerInputPad.style.display = "none";
    }
});

// ================= AUTOMATIC TIMEOUT FLUSH EVENT (No Points Penalty Rule) =================
socket.on('tp_roundTimeoutExpired', ({ actualAnswer, players }) => {
    clearInterval(uiTimerInterval); buzzerInputPad.style.display = "none"; gameArea.style.display = "none";
    roundFeedbackScreen.style.display = "block";
    
    const header = document.getElementById('round-outcome-header');
    header.innerText = "⏱️ TIME EXPIRED! NO ONE BUZZED! 🛑";
    header.style.color = "#ffaa00";
    
    document.getElementById('reveal-correct-word-label').innerText = actualAnswer.toUpperCase();
    updateLiveScorecardDisplay(players);
});

submitTypedAnswerBtn.addEventListener('click', () => {
    const ans = textAnswerField.value.trim(); if (!ans) return alert("Blank values entry invalid!");
    socket.emit('tp_submitAnswer', { roomCode: currentRoom, submittedAnswer: ans });
});

socket.on('tp_roundOutcome', ({ playerName, isCorrect, actualAnswer, players }) => {
    buzzerInputPad.style.display = "none"; gameArea.style.display = "none"; roundFeedbackScreen.style.display = "block";
    const header = document.getElementById('round-outcome-header');
    if (isCorrect) { header.innerText = `💥 CORRECT! POINT TO ${playerName.toUpperCase()}! 🎉`; header.style.color = "#00f0ff"; } 
    else { header.innerText = `❌ INCORRECT! MINUS POINT TO ${playerName.toUpperCase()}! 🛑`; header.style.color = "#ff007f"; }
    document.getElementById('reveal-correct-word-label').innerText = actualAnswer.toUpperCase();
    updateLiveScorecardDisplay(players);
});

socket.on('tp_gameFinished', ({ leaderboard }) => {
    clearInterval(uiTimerInterval); gameArea.style.display = "none"; roundFeedbackScreen.style.display = "none";
    finalLeaderboardScreen.style.display = "block";
    document.getElementById('final-podium-list').innerHTML = leaderboard.map((p, idx) => {
        let icon = idx === 0 ? "👑" : "👤";
        return `<div style="padding:12px; background:#111; margin:8px 0; border: 1px solid #ff007f; color:${idx===0?'#00f0ff':'#fff'};">
            ${icon} RANK ${idx+1}: ${p.name.toUpperCase()} - [ ${p.score} PX ]
        </div>`;
    }).join('');
    playAgainMasterBtn.style.display = socket.id === currentAdminId ? "inline-block" : "none";
});

micCaptureBtn.addEventListener('click', () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SpeechRecognition) return alert("Mic API error!");
    const recognition = new SpeechRecognition(); recognition.lang = "ta-IN"; recognition.interimResults = false;
    micCaptureBtn.innerText = "🎤 LISTENING..."; recognition.start();
    recognition.onresult = (event) => {
        let out = event.results[0][0].transcript.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim().toLowerCase();
        textAnswerField.value = out; micCaptureBtn.innerText = "🎤 CAPTURED!";
    };
    recognition.onerror = () => { micCaptureBtn.innerText = "❌ TRY AGAIN"; };
    recognition.onspeechend = () => { recognition.stop(); };
});