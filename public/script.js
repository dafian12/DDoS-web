// Global variables
let socket = null;
let isConnected = false;
let pairingCode = null;

// DOM Elements
const initializeBtn = document.getElementById('initializeBtn');
const checkStatusBtn = document.getElementById('checkStatusBtn');
const statusContainer = document.getElementById('statusContainer');
const statusText = document.getElementById('statusText');
const pairingContainer = document.getElementById('pairingContainer');
const pairingCodeDisplay = document.getElementById('pairingCodeDisplay');
const connectionStatus = document.getElementById('connectionStatus');
const dashboardAccess = document.getElementById('dashboardAccess');
const logBox = document.getElementById('logBox');

// Initialize Socket.io
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        addLog('Connected to server', 'info');
        checkCurrentStatus();
    });
    
    socket.on('disconnect', () => {
        addLog('Disconnected from server', 'warning');
        updateStatus('offline', 'Server disconnected');
    });
    
    socket.on('pairing_code', (data) => {
        pairingCode = data.code;
        showPairingCode(data.code);
        addLog(`Pairing code generated: ${data.code}`, 'success');
        updateStatus('connecting', 'Enter code in WhatsApp');
    });
    
    socket.on('whatsapp_status', (data) => {
        if (data.connected) {
            updateStatus('online', `Connected as ${data.user?.name || data.user?.pushname || 'Unknown'}`);
            showDashboardAccess();
            addLog('WhatsApp connected successfully!', 'success');
        } else {
            updateStatus('offline', data.reason || 'WhatsApp disconnected');
            hideDashboardAccess();
        }
    });
    
    socket.on('whatsapp_error', (data) => {
        addLog(`WhatsApp error: ${data.error}`, 'error');
        updateStatus('offline', 'Connection error');
    });
}

// Update status display
function updateStatus(status, message) {
    const indicator = statusContainer.querySelector('.status-indicator');
    const dot = indicator.querySelector('.status-dot');
    
    // Remove all status classes
    indicator.classList.remove('online', 'offline', 'connecting');
    dot.classList.remove('online', 'offline', 'connecting');
    
    // Add new status
    indicator.classList.add(status);
    dot.classList.add(status);
    
    // Update text
    indicator.innerHTML = `
        <div class="status-dot"></div>
        <span>${status.toUpperCase()}</span>
    `;
    
    statusText.textContent = message;
    
    // Update connection status
    if (pairingContainer.style.display !== 'none') {
        connectionStatus.className = 'connection-status ' + status;
        connectionStatus.innerHTML = `
            <i class="fas fa-${status === 'online' ? 'check' : 
                            status === 'connecting' ? 'sync fa-spin' : 'times'}-circle"></i>
            <span>${message}</span>
        `;
    }
}

// Show pairing code
function showPairingCode(code) {
    pairingContainer.style.display = 'block';
    pairingCodeDisplay.innerHTML = code;
    connectionStatus.style.display = 'flex';
}

// Show dashboard access
function showDashboardAccess() {
    dashboardAccess.style.display = 'block';
    pairingContainer.style.display = 'none';
}

// Hide dashboard access
function hideDashboardAccess() {
    dashboardAccess.style.display = 'none';
}

// Check current status
function checkCurrentStatus() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            if (data.initialized && data.whatsapp?.connected) {
                updateStatus('online', 'Already connected');
                showDashboardAccess();
            } else if (data.initialized) {
                updateStatus('connecting', 'Waiting for WhatsApp connection');
                pairingContainer.style.display = 'block';
            } else {
                updateStatus('offline', 'Ready to initialize');
            }
        })
        .catch(error => {
            addLog(`Status check failed: ${error.message}`, 'error');
        });
}

// Initialize WhatsApp bot
function initializeWhatsApp() {
    updateStatus('connecting', 'Initializing WhatsApp bot...');
    addLog('Initializing WhatsApp bot...', 'info');
    
    fetch('/api/initialize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addLog('WhatsApp bot initialized successfully', 'success');
            pairingContainer.style.display = 'block';
        } else {
            addLog(`Initialization failed: ${data.error}`, 'error');
            updateStatus('offline', 'Initialization failed');
        }
    })
    .catch(error => {
        addLog(`Initialization error: ${error.message}`, 'error');
        updateStatus('offline', 'Connection error');
    });
}

// Add log entry
function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const time = new Date().toLocaleTimeString();
    const typeClass = type === 'error' ? 'error' : 
                     type === 'success' ? 'success' : 'info';
    
    logEntry.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-message ${typeClass}">${message}</span>
    `;
    
    logBox.appendChild(logEntry);
    logBox.scrollTop = logBox.scrollHeight;
}

// Event Listeners
initializeBtn.addEventListener('click', initializeWhatsApp);

checkStatusBtn.addEventListener('click', () => {
    addLog('Checking system status...', 'info');
    checkCurrentStatus();
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    addLog('System loaded. Ready to connect WhatsApp.', 'info');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl + I to initialize
    if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        initializeWhatsApp();
    }
    
    // Ctrl + S to check status
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        checkCurrentStatus();
    }
    
    // Ctrl + L to clear logs
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        logBox.innerHTML = '<div class="log-entry"><span class="log-time">[00:00:00]</span><span class="log-message">Logs cleared</span></div>';
    }
});
