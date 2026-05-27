const authBox = document.getElementById('auth-box');
const dashboard = document.getElementById('dashboard');
const profileSection = document.getElementById('profile-section');
const navActions = document.getElementById('nav-actions');

const gamesTabBtn = document.getElementById('gamesTabBtn');
const profileTabBtn = document.getElementById('profileTabBtn');
const logoutBtn = document.getElementById('logoutBtn');
const enterPortalBtn = document.getElementById('enterPortalBtn');
const authTitle = document.getElementById('auth-title');
const authToggleLink = document.getElementById('authToggleLink');

const loginUser = document.getElementById('login-username');
const loginPass = document.getElementById('login-password');
const welcomeUser = document.getElementById('welcome-user');
const profName = document.getElementById('prof-name');
const profWins = document.getElementById('prof-wins');

let isLoginFormState = true; // Simple Form Toggle Flag

// 1. Toggle Login / Signup Panels Form Text Elements
authToggleLink.addEventListener('click', () => {
    isLoginFormState = !isLoginFormState;
    if (isLoginFormState) {
        authTitle.innerText = "Vaa Macha! Login and Play 🚀";
        enterPortalBtn.innerText = "Login 🔥";
        authToggleLink.innerText = "New user? Account Create Pannu macha!";
    } else {
        authTitle.innerText = "Puthiya Account Open Pannu! ✨";
        enterPortalBtn.innerText = "Create Account 🛠️";
        authToggleLink.innerText = "Already account irukka? Login pannu macha!";
    }
});

// 2. Clear & Bulletproof Form API Submit Button Trigger
enterPortalBtn.addEventListener('click', async () => {
    const username = loginUser.value.trim();
    const password = loginPass.value.trim();

    if (!username || !password) {
        alert("Fields completely fill pannu macha!");
        return;
    }

    // Determine target API URL path based on current toggle state flag parameters
    const endpoint = isLoginFormState ? '/api/login' : '/api/signup';

    try {
        console.log(`Sending API request tracking path to: ${endpoint}`);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();

        // If backend explicitly returned any logic validations check tracking errors
        if (data.error) {
            alert(data.error);
            return;
        }

        if (data.success) {
            // Lock active sessions configurations directly into local browser parameters storage cache
            localStorage.setItem('machaUsername', data.username);
            localStorage.setItem('machaWins', data.wins);
            
            activatePortalSession(data.username, data.wins);
        } else {
            alert("Unexpected error response mapping profile keys.");
        }

    } catch (err) {
        // Fallback handling error strings variables logs configuration check trace
        console.error("Frontend fetch error log stack tracking data:", err);
        alert("Frontend and Backend Connection sync check required macha!");
    }
});

// 3. Activate Live Dashboard Layout Screens Toggle Control
function activatePortalSession(username, wins) {
    welcomeUser.innerText = username;
    profName.innerText = username;
    profWins.innerText = wins;

    authBox.style.display = "none";
    navActions.style.display = "flex";
    
    profileSection.style.display = "none";
    dashboard.style.display = "block";
    gamesTabBtn.style.backgroundColor = "#00fff5";
    gamesTabBtn.style.color = "#1a1a2e";
}

// Nav Tab Switches Toggles Click Actions Controls Handling
gamesTabBtn.addEventListener('click', () => {
    profileSection.style.display = "none"; 
    dashboard.style.display = "block";
    gamesTabBtn.style.backgroundColor = "#00fff5"; 
    gamesTabBtn.style.color = "#1a1a2e";
    profileTabBtn.style.backgroundColor = "#1f4068"; 
    profileTabBtn.style.color = "#00fff5";
});

profileTabBtn.addEventListener('click', () => {
    dashboard.style.display = "none"; 
    profileSection.style.display = "block";
    profileTabBtn.style.backgroundColor = "#00fff5"; 
    profileTabBtn.style.color = "#1a1a2e";
    gamesTabBtn.style.backgroundColor = "#1f4068"; 
    gamesTabBtn.style.color = "#00fff5";
});

// Logout Cache Purge Sequence
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    navActions.style.display = "none"; 
    dashboard.style.display = "none"; 
    profileSection.style.display = "none";
    authBox.style.display = "block";
    alert("Logged out successfully macha! 👋");
});

// Initial Page Load Memory Verification Loops Check
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('machaUsername');
    const savedWins = localStorage.getItem('machaWins');
    if (savedUser) {
        activatePortalSession(savedUser, savedWins || 14);
    }
});

function launchGame(gameFolderName) {
    const username = localStorage.getItem('machaUsername') || "AnonymousMacha";
    window.location.href = `/games/${gameFolderName}/index.html?user=${encodeURIComponent(username)}`;
}