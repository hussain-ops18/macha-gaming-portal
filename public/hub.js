// ================= OMNITRIX SYSTEMS DASHBOARD CORE PROTOCOL RE-ENGINEERED =================

function retrieveOrCompileProfileUid() {
    let existingUid = localStorage.getItem('machaUserUID');
    if (!existingUid) {
        let generatedRandomCode = Math.floor(1000 + Math.random() * 9000);
        existingUid = `UID-${generatedRandomCode}`;
        localStorage.setItem('machaUserUID', existingUid);
    }
    return existingUid;
}

function evaluateWinningStreakCount(totalWins) {
    let baseWinsCount = parseInt(totalWins) || 0;
    if (baseWinsCount === 0) return 0;
    
    let cachedLocalStreak = localStorage.getItem('machaActiveStreakValue');
    if (!cachedLocalStreak || parseInt(cachedLocalStreak) === 0) {
        let initialCalculatedStreakValue = Math.ceil(baseWinsCount * 1.5);
        localStorage.setItem('machaActiveStreakValue', initialCalculatedStreakValue);
        return initialCalculatedStreakValue;
    }
    return parseInt(cachedLocalStreak);
}

// Fixed session parameter fallbacks to avoid browser layout string script freezing blocks
const activeUserSessionName = localStorage.getItem('machaUsername') || "Macha_Pilot";
const activeUserSessionWins = localStorage.getItem('machaWins') || "0";
const userProfileUniqueIdKey = retrieveOrCompileProfileUid();
const userProfileActiveStreak = evaluateWinningStreakCount(activeUserSessionWins);

// Safe DOM injectors validation block checks parameters rules
if(document.getElementById('hud-username-display')) {
    document.getElementById('hud-username-display').innerText = activeUserSessionName.toUpperCase();
}
if(document.getElementById('hud-uid-display')) {
    document.getElementById('hud-uid-display').innerText = userProfileUniqueIdKey;
}
if(document.getElementById('hud-wins-counter')) {
    document.getElementById('hud-wins-counter').innerText = activeUserSessionWins;
}
if(document.getElementById('hud-streak-counter')) {
    document.getElementById('hud-streak-counter').innerText = `${userProfileActiveStreak} RNDS`;
}
if(document.getElementById('avatar-initials-label')) {
    document.getElementById('avatar-initials-label').innerText = activeUserSessionName.charAt(0).toUpperCase();
}

// ================= DYNAMIC OMNITRIX VERTICAL WHEEL SCROLL SNAP SELECTION TRACKER =================
const trackNode = document.getElementById('watch-scroller-track-node');
const cardG1 = document.getElementById('card-alien-g1');
const cardG2 = document.getElementById('card-alien-g2');

function handleDialTrackingRepositionEvent() {
    if(!trackNode || !cardG1 || !cardG2) return;
    let trackScrollTopPosition = trackNode.scrollTop;
    
    if (trackScrollTopPosition < 130) {
        cardG1.classList.add('focused-dial-element');
        cardG2.classList.remove('focused-dial-element');
    } else {
        cardG2.classList.add('focused-dial-element');
        cardG1.classList.remove('focused-dial-element');
    }
}

if(document.querySelector('.arrow-up') && trackNode) {
    document.querySelector('.arrow-up').addEventListener('click', () => { trackNode.scrollTop -= 200; });
}
if(document.querySelector('.arrow-down') && trackNode) {
    document.querySelector('.arrow-down').addEventListener('click', () => { trackNode.scrollTop += 200; });
}

// CRITICAL ROUTING FIXES: Enforces explicit relative paths to bypass browser address bar latency traps!
function igniteModuleOneRoute() {
    const targetUser = encodeURIComponent(activeUserSessionName);
    window.location.assign("./games/vaanga-kandu-pidikkalaam/index.html?user=" + targetUser);
}

function igniteModuleTwoRoute() {
    const targetUser = encodeURIComponent(activeUserSessionName);
    window.location.assign("./games/takkunu-paaru/index.html?user=" + targetUser);
}

// ================= FRIENDS REPOSITORY SUBSYSTEM DATA INTERFACE =================
let simulatedFriendsDatabaseList = [
    { name: "Parthasarathy", uid: "UID-7492" },
    { name: "Dinesh 'Theeya Sakthi'", uid: "UID-1094" },
    { name: "Yukesh 'Tall Boy'", uid: "UID-8831" }
];

let mockRecentPlayersSessionList = [
    { name: "Dinesh 'Theeya Sakthi'", uid: "UID-1094", dynamicMatchResult: "Lost Round -1" },
    { name: "Parthasarathy", uid: "UID-7492", dynamicMatchResult: "Won Round +1" }
];

function renderFriendsListRepositoryPads() {
    let savedLocalFriendsCache = localStorage.getItem('machaStoredFriendsList');
    if (!savedLocalFriendsCache) {
        localStorage.setItem('machaStoredFriendsList', JSON.stringify(simulatedFriendsDatabaseList));
        savedLocalFriendsCache = JSON.stringify(simulatedFriendsDatabaseList);
    }
    let friendsArrayParsed = JSON.parse(savedLocalFriendsCache);
    const renderPad = document.getElementById('friends-list-render-pad');
    
    if(renderPad) {
        renderPad.innerHTML = friendsArrayParsed.map(friend => `
            <div class="social-row-node">
                <div>🟢 <span>${friend.name}</span><span class="node-uid-label">${friend.uid}</span></div>
                <span style="color:#00ff66; font-size:0.75rem; font-weight:bold; font-family:'Orbitron';">READY</span>
            </div>
        `).join('');
    }
}

function renderRecentPlayersSessionGrid() {
    const pad = document.getElementById('recent-players-render-pad');
    if(pad) {
        pad.innerHTML = mockRecentPlayersSessionList.map(p => `
            <div class="social-row-node">
                <div>👤 <span>${p.name}</span><span class="node-uid-label">${p.uid}</span></div>
                <button onclick="executeQuickAddFriendAction('${p.name}', '${p.uid}');" class="action-icon-btn">LINK 🔗</button>
            </div>
        `).join('');
    }
}

function executeAddFriendUidAction() {
    const field = document.getElementById('friendUidInput');
    if(!field) return;
    const incomingUidVal = field.value.toString().trim().toUpperCase();
    if (!incomingUidVal) return alert("UID box empty macha!");
    
    let currentCache = JSON.parse(localStorage.getItem('machaStoredFriendsList')) || [];
    if (currentCache.some(f => f.uid === incomingUidVal)) return alert("Intha UID aal munaadiye list-la irukaanga macha! 🧩");

    let targetNewFriendNode = { name: `Macha_Crew_${Math.floor(10 + Math.random() * 90)}`, uid: incomingUidVal };
    currentCache.push(targetNewFriendNode);
    localStorage.setItem('machaStoredFriendsList', JSON.stringify(currentCache));
    field.value = "";
    renderFriendsListRepositoryPads();
}

function executeQuickAddFriendAction(friendName, friendUid) {
    let currentCache = JSON.parse(localStorage.getItem('machaStoredFriendsList')) || [];
    if (currentCache.some(f => f.uid === friendUid)) return alert("Munnadiye linked thala! 🟢");
    
    currentCache.push({ name: friendName, uid: friendUid });
    localStorage.setItem('machaStoredFriendsList', JSON.stringify(currentCache));
    renderFriendsListRepositoryPads();
}

function triggerSystemCoreEject() {
    localStorage.clear(); 
    // Fallback security routing check to safely loop exit gateways loops smoothly
    window.location.replace("./index.html");
}

// Initializing execution runs safely on boot script blocks
renderFriendsListRepositoryPads();
renderRecentPlayersSessionGrid();