// lib/whatsapp.js
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode-terminal');
const EventEmitter = require('events');

class WhatsAppBot extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.isConnected = false;
        this.pairingCode = null;
        this.store = null;
    }

    async initialize(mongoURI) {
        try {
            // Connect to MongoDB
            await mongoose.connect(mongoURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });

            this.store = new MongoStore({ mongoose: mongoose });

            this.client = new Client({
                authStrategy: new RemoteAuth({
                    store: this.store,
                    backupSyncIntervalMs: 300000,
                    clientId: 'mass-report-bot'
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--disable-gpu'
                    ]
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
                }
            });

            this.setupEvents();
            await this.client.initialize();

            return { success: true };
        } catch (error) {
            this.emit('error', error);
            return { success: false, error: error.message };
        }
    }

    setupEvents() {
        this.client.on('qr', (qr) => {
            // Generate 8-digit pairing code
            this.pairingCode = Math.floor(10000000 + Math.random() * 90000000);
            
            // Display QR in terminal
            qrcode.generate(qr, { small: true });
            console.log(`[WHATSAPP] Pairing Code: ${this.pairingCode}`);
            
            this.emit('pairing_code', {
                code: this.pairingCode,
                qr: qr
            });
        });

        this.client.on('ready', () => {
            console.log('[WHATSAPP] Client is ready!');
            this.isConnected = true;
            this.emit('ready', {
                user: this.client.info.me,
                platform: this.client.info.platform
            });
        });

        this.client.on('authenticated', () => {
            console.log('[WHATSAPP] Authenticated');
            this.emit('authenticated');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('[WHATSAPP] Auth failure:', msg);
            this.isConnected = false;
            this.emit('auth_failure', msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('[WHATSAPP] Disconnected:', reason);
            this.isConnected = false;
            this.emit('disconnected', reason);
        });
