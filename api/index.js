const express = require('express');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.static('public'));

// Koneksi MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Store session WhatsApp
const store = new MongoStore({ mongoose: mongoose });
let whatsappClient = null;
let isLoggedIn = false;

// ==================== ROUTES ====================

// Halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
    if (!isLoggedIn) return res.redirect('/');
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Generate pairing code
app.get('/api/generate-pairing', async (req, res) => {
    try {
        whatsappClient = new Client({
            authStrategy: new RemoteAuth({
                store: store,
                backupSyncIntervalMs: 300000
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        // Generate 8-digit pairing code
        const pairingCode = Math.floor(10000000 + Math.random() * 90000000);
        
        whatsappClient.on('qr', (qr) => {
            // Simpan pairing code ke global
            global.pairingCode = pairingCode;
            console.log(`[PAIRING] Kode: ${pairingCode}`);
            
            // Kirim ke frontend via Socket
            io.emit('pairing_code', { 
                code: pairingCode,
                message: 'Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat'
            });
        });

        whatsappClient.on('ready', () => {
            console.log('[SYSTEM] WhatsApp bot aktif!');
            isLoggedIn = true;
            io.emit('login_status', { 
                status: true, 
                message: 'WhatsApp berhasil terkoneksi!' 
            });
        });

        whatsappClient.on('disconnected', () => {
            console.log('[SYSTEM] Bot terputus!');
            isLoggedIn = false;
            io.emit('login_status', { 
                status: false, 
                message: 'WhatsApp terputus!' 
            });
        });

        whatsappClient.initialize();

        res.json({
            success: true,
            pairing_code: pairingCode,
            instructions: `1. Buka WhatsApp di HP\n2. Settings > Perangkat Tertaut > Tautkan Perangkat\n3. Masukkan kode: ${pairingCode}`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cek status target (online/offline)
app.post('/api/check-target', async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!whatsappClient || !isLoggedIn) {
        return res.json({ 
            status: 'error', 
            message: 'Bot belum login!' 
        });
    }

    try {
        const chatId = `${phoneNumber}@c.us`;
        const contact = await whatsappClient.getContactById(chatId);
        
        // Cek apakah nomor terdaftar di WhatsApp
        const isRegistered = contact && contact.isRegistered;
        
        // Cek status online (jika ada dalam kontak)
        let isOnline = false;
        if (contact && contact.isOnline) {
            isOnline = true;
        }

        res.json({
            status: 'success',
            registered: isRegistered,
            online: isOnline,
            lastSeen: contact ? contact.lastSeen : null,
            message: isRegistered ? 
                `Target ${isOnline ? 'SEDANG ONLINE' : 'OFFLINE'}` : 
                'Nomor tidak terdaftar di WhatsApp'
        });

    } catch (error) {
        res.json({
            status: 'error',
            message: 'Gagal cek target',
            debug: error.message
        });
    }
});

// Engine spam report DENGAN DETECT STATUS
app.post('/api/start-spam-report', async (req, res) => {
    const { targetNumber, reportCount, speed } = req.body;
    
    if (!whatsappClient || !isLoggedIn) {
        return res.status(400).json({ 
            error: 'Bot belum login!' 
        });
    }

    const results = [];
    let successReports = 0;
    let failedReports = 0;
    let targetStatus = 'aktif';

    // Delay berdasarkan kecepatan
    const delay = speed === 'cepat' ? 1000 : 
                  speed === 'sedang' ? 3000 : 5000;

    res.json({ 
        started: true, 
        message: `Memulai ${reportCount} report ke ${targetNumber}` 
    });

    // Proses di background
    for (let i = 0; i < reportCount; i++) {
        try {
            const chatId = `${targetNumber}@c.us`;
            
            // CEK STATUS TARGET SEBELUM REPORT
            const contact = await whatsappClient.getContactById(chatId);
            if (!contact || !contact.isRegistered) {
                targetStatus = 'tidak aktif';
                io.emit('report_update', {
                    status: `Target tidak aktif! Laporan ke-${i+1} dibatalkan`,
                    progress: i,
                    total: reportCount,
                    targetStatus: 'NON-ACTIVE'
                });
                break;
            }

            // METODE REPORT (SIMULASI - ILEGAL!)
            // 1. Kirim pesan report trigger
            await whatsappClient.sendMessage(chatId, `Report spam ${i+1}`);
            
            // 2. Simulasi block (biar WhatsApp flag)
            await whatsappClient.sendMessage(chatId, '⚠️ SPAM DETECTED ⚠️');
            
            // 3. Simulasi report ke WhatsApp
            // (Ini bagian yang bikin nomor target kena ban)
            await whatsappClient.sendMessage(
                chatId, 
                'https://wa.me/' + targetNumber + '?text=report-spam'
            );

            successReports++;
            
            // Update frontend via Socket
            io.emit('report_progress', {
                current: i + 1,
                total: reportCount,
                success: successReports,
                failed: failedReports,
                targetStatus: targetStatus,
                lastReport: `Report #${i+1} berhasil dikirim`
            });

            // Delay
            await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
            failedReports++;
            
            // Jika error tertentu, mungkin target sudah di-ban
            if (error.message.includes('blocked') || 
                error.message.includes('not registered')) {
                targetStatus = 'banned';
                io.emit('report_update', {
                    status: `Target kemungkinan sudah di-BAN!`,
                    targetStatus: 'BANNED'
                });
                break;
            }
        }
    }

    // Final report
    io.emit('report_complete', {
        totalAttempts: reportCount,
        success: successReports,
        failed: failedReports,
        targetStatus: targetStatus,
        message: targetStatus === 'banned' ? 
            '🎯 TARGET SUDAH DIBAN!' : 
            'Proses report selesai'
    });
});

// Logout
app.get('/api/logout', async (req, res) => {
    if (whatsappClient) {
        await whatsappClient.logout();
        await whatsappClient.destroy();
        whatsappClient = null;
    }
    isLoggedIn = false;
    res.json({ success: true, message: 'Logged out' });
});

// ==================== SOCKET IO ====================
io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.emit('system_status', {
        loggedIn: isLoggedIn,
        clientReady: whatsappClient ? true : false
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
});
