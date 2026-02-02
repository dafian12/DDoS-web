const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const EventEmitter = require('events');

class WhatsAppBot extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.isConnected = false;
        this.pairingCode = null;
        this.store = null;
        this.userInfo = null;
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
                    clientId: 'mass-report-bot-v2'
                }),
                puppeteer: {
                    headless: 'new',
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--disable-gpu',
                        '--window-size=1920,1080'
                    ]
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
                }
            });

            this.setupEvents();
            await this.client.initialize();

            return { success: true, message: 'WhatsApp bot initialized' };
        } catch (error) {
            console.error('[WHATSAPP] Initialize error:', error);
            this.emit('error', error);
            return { success: false, error: error.message };
        }
    }

    setupEvents() {
        this.client.on('qr', (qr) => {
            // Generate 6-digit pairing code
            this.pairingCode = Math.floor(100000 + Math.random() * 900000);
            
            console.log(`[WHATSAPP] Pairing Code: ${this.pairingCode}`);
            
            this.emit('pairing_code', {
                code: this.pairingCode,
                qr: qr,
                message: 'Masukkan kode ini di WhatsApp > Linked Devices'
            });
        });

        this.client.on('ready', () => {
            console.log('[WHATSAPP] Client is ready!');
            this.isConnected = true;
            this.userInfo = this.client.info.me;
            
            this.emit('ready', {
                user: this.userInfo,
                platform: this.client.info.platform,
                connected: true
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

        this.client.on('message', (msg) => {
            // Log incoming messages if needed
            if (msg.from !== 'status@broadcast') {
                console.log(`[MESSAGE] From: ${msg.from} | Body: ${msg.body.substring(0, 50)}...`);
            }
        });

        this.client.on('change_state', (state) => {
            console.log('[WHATSAPP] State changed:', state);
            this.emit('state_change', state);
        });
    }

    async checkNumberStatus(phoneNumber) {
        try {
            if (!this.isConnected || !this.client) {
                return { error: 'WhatsApp not connected' };
            }

            const chatId = `${phoneNumber}@c.us`;
            const [contact, chat] = await Promise.all([
                this.client.getContactById(chatId).catch(() => null),
                this.client.getChatById(chatId).catch(() => null)
            ]);

            const result = {
                registered: !!contact?.isRegistered,
                exists: !!contact,
                number: phoneNumber,
                timestamp: new Date().toISOString()
            };

            if (contact) {
                result.name = contact.name || contact.pushname || contact.shortName || 'Unknown';
                result.isBusiness = contact.isBusiness || false;
                result.isEnterprise = contact.isEnterprise || false;
            }

            if (chat) {
                result.lastSeen = chat.lastSeen || null;
                result.isOnline = chat.isOnline || false;
                result.unreadCount = chat.unreadCount || 0;
            }

            return result;
        } catch (error) {
            console.error('[WHATSAPP] Check number error:', error);
            return { error: error.message, registered: false };
        }
    }

    async sendMessage(phoneNumber, message) {
        try {
            if (!this.isConnected) {
                return { error: 'WhatsApp not connected' };
            }

            const chatId = `${phoneNumber}@c.us`;
            const sent = await this.client.sendMessage(chatId, message);
            
            return {
                success: true,
                messageId: sent.id._serialized,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return { error: error.message, success: false };
        }
    }

    async logout() {
        try {
            if (this.client) {
                await this.client.logout();
                await this.client.destroy();
                this.client = null;
                this.isConnected = false;
                this.userInfo = null;
                
                // Close mongoose connection
                await mongoose.connection.close();
                
                return { success: true, message: 'Logged out successfully' };
            }
            return { success: false, message: 'No active session' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            pairingCode: this.pairingCode,
            user: this.userInfo,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = WhatsAppBot;
