const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const WhatsAppBot = require('../lib/whatsapp');
const WhatsAppReporter = require('../lib/reporter');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Global instances
let whatsappBot = null;
let reporter = null;
let isInitialized = false;

// Initialize WhatsApp
async function initializeWhatsApp() {
    if (isInitialized) return whatsappBot;
    
    try {
        whatsappBot = new WhatsAppBot();
        reporter = new WhatsAppReporter(whatsappBot);
        
        // Setup event listeners
        whatsappBot.on('pairing_code', (data) => {
            io.emit('pairing_code', data);
        });
        
        whatsappBot.on('ready', (data) => {
            io.emit('whatsapp_status', { connected: true, user: data.user });
        });
        
        whatsappBot.on('disconnected', (reason) => {
            io.emit('whatsapp_status', { connected: false, reason: reason });
            isInitialized = false;
        });
        
        whatsappBot.on('error', (error) => {
            io.emit('whatsapp_error', { error: error.message });
        });
        
        // Reporter events
        reporter.on('report_started', (data) => {
            io.emit('report_started', data);
        });
        
        reporter.on('report_progress', (data) => {
            io.emit('report_progress', data);
        });
        
        reporter.on('report_completed', (data) => {
            io.emit('report_completed', data);
        });
        
        reporter.on('target_banned', (data) => {
            io.emit('target_banned', data);
        });
        
        reporter.on('report_error', (data) => {
            io.emit('report_error', data);
        });
        
        // Initialize with MongoDB
        const result = await whatsappBot.initialize(process.env.MONGODB_URI);
        
        if (result.success) {
            isInitialized = true;
            console.log('[SYSTEM] WhatsApp bot initialized successfully');
            return whatsappBot;
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('[SYSTEM] Initialization failed:', error);
        throw error;
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// API Endpoints
app.get('/api/status', async (req, res) => {
    try {
        if (!whatsappBot) {
            return res.json({ 
                initialized: false, 
                connected: false,
                message: 'WhatsApp not initialized'
            });
        }
        
        const status = whatsappBot.getStatus();
        const reportStatus = reporter ? reporter.getReportStatus() : null;
        
        res.json({
            initialized: isInitialized,
            whatsapp: status,
            reporter: reportStatus,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/initialize', async (req, res) => {
    try {
        if (isInitialized) {
            return res.json({ 
                success: true, 
                message: 'Already initialized',
                status: whatsappBot.getStatus()
            });
        }
        
        await initializeWhatsApp();
        
        res.json({ 
            success: true, 
            message: 'WhatsApp bot initialized',
            status: whatsappBot.getStatus()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/check-target', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!whatsappBot || !whatsappBot.isConnected) {
            return res.status(400).json({ 
                error: 'WhatsApp not connected. Please initialize first.' 
            });
        }
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                error: 'Phone number is required' 
            });
        }
        
        const result = await whatsappBot.checkNumberStatus(phoneNumber);
        
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/start-report', async (req, res) => {
    try {
        const { targetNumber, reportCount, speed } = req.body;
        
        if (!whatsappBot || !whatsappBot.isConnected) {
            return res.status(400).json({ 
                error: 'WhatsApp not connected' 
            });
        }
        
        if (!targetNumber || !reportCount) {
            return res.status(400).json({ 
                error: 'Target number and report count are required' 
            });
        }
        
        // Start report in background
        reporter.startSpamReport(targetNumber, parseInt(reportCount), speed || 'medium')
            .then(result => {
                console.log('[REPORT] Completed:', result);
            })
            .catch(error => {
                console.error('[REPORT] Failed:', error);
            });
        
        res.json({ 
            success: true, 
            message: 'Report started',
            target: targetNumber,
            count: reportCount,
            speed: speed || 'medium'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/stop-report', async (req, res) => {
    try {
        if (!reporter) {
            return res.status(400).json({ 
                error: 'Reporter not initialized' 
            });
        }
        
        const result = reporter.stopSpamReport();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/logout', async (req, res) => {
    try {
        if (whatsappBot) {
            await whatsappBot.logout();
            whatsappBot = null;
            reporter = null;
            isInitialized = false;
            
            io.emit('whatsapp_status', { connected: false, reason: 'logged_out' });
            
            res.json({ 
                success: true, 
                message: 'Logged out successfully' 
            });
        } else {
            res.json({ 
                success: false, 
                message: 'No active session' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('[SOCKET] New client connected:', socket.id);
    
    // Send current status
    if (whatsappBot) {
        socket.emit('whatsapp_status', { 
            connected: whatsappBot.isConnected,
            user: whatsappBot.userInfo,
            pairingCode: whatsappBot.pairingCode
        });
    } else {
        socket.emit('whatsapp_status', { connected: false });
    }
    
    if (reporter) {
        socket.emit('report_status', reporter.getReportStatus());
    }
    
    socket.on('disconnect', () => {
        console.log('[SOCKET] Client disconnected:', socket.id);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('[SERVER] Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SERVER] WhatsApp Mass Report running on port ${PORT}`);
    console.log(`[SERVER] Dashboard: http://localhost:${PORT}`);
    console.log(`[SERVER] API Status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[SERVER] Shutting down...');
    
    if (whatsappBot) {
        await whatsappBot.logout();
    }
    
    server.close(() => {
        console.log('[SERVER] Server closed');
        process.exit(0);
    });
});

module.exports = app;
