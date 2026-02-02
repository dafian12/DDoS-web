const EventEmitter = require('events');

class WhatsAppReporter extends EventEmitter {
    constructor(whatsappBot) {
        super();
        this.bot = whatsappBot;
        this.isReporting = false;
        this.currentTask = null;
        this.stats = {
            totalAttempts: 0,
            success: 0,
            failed: 0,
            targetStatus: 'unknown',
            startTime: null,
            endTime: null
        };
    }

    async startSpamReport(targetNumber, reportCount, speed = 'medium') {
        if (this.isReporting) {
            return { error: 'Report already in progress' };
        }

        if (!this.bot.isConnected) {
            return { error: 'WhatsApp not connected' };
        }

        this.isReporting = true;
        this.stats = {
            totalAttempts: reportCount,
            success: 0,
            failed: 0,
            targetStatus: 'checking',
            startTime: new Date().toISOString(),
            endTime: null
        };

        this.currentTask = {
            targetNumber,
            reportCount,
            speed,
            cancelled: false
        };

        // Set speed delays (ms)
        const delays = {
            fast: 1000,      // 1 second
            medium: 3000,    // 3 seconds
            slow: 5000       // 5 seconds
        };

        const delay = delays[speed] || delays.medium;

        // Check target status first
        try {
            const status = await this.bot.checkNumberStatus(targetNumber);
            this.stats.targetStatus = status.registered ? 'active' : 'inactive';
            
            this.emit('target_status', {
                status: status.registered ? 'active' : 'inactive',
                details: status
            });

            if (!status.registered) {
                this.isReporting = false;
                return { 
                    error: 'Target not registered on WhatsApp',
                    details: status 
                };
            }
        } catch (error) {
            this.isReporting = false;
            return { error: `Failed to check target: ${error.message}` };
        }

        // Start reporting
        this.emit('report_started', {
            target: targetNumber,
            count: reportCount,
            speed: speed,
            startTime: this.stats.startTime
        });

        // Process reports
        for (let i = 0; i < reportCount; i++) {
            if (this.currentTask.cancelled) {
                break;
            }

            try {
                // Report method 1: Send spam-like messages
                await this.bot.sendMessage(
                    targetNumber, 
                    `⚠️ SPAM ALERT ${i + 1}: This account is sending spam messages. Please report.`
                );

                // Report method 2: Send report trigger
                await this.bot.sendMessage(
                    targetNumber,
                    `REPORT-CODE: ${this.generateReportCode()} - This message violates WhatsApp policies.`
                );

                // Report method 3: Send suspicious link (triggers WhatsApp detection)
                await this.bot.sendMessage(
                    targetNumber,
                    `Warning: https://wa.me/${targetNumber}?text=spam-report-${Date.now()}`
                );

                this.stats.success++;
                
                this.emit('report_progress', {
                    current: i + 1,
                    total: reportCount,
                    success: this.stats.success,
                    failed: this.stats.failed,
                    targetStatus: this.stats.targetStatus,
                    percentage: Math.round(((i + 1) / reportCount) * 100)
                });

                // Check if target might be banned (every 10 reports)
                if ((i + 1) % 10 === 0) {
                    const status = await this.bot.checkNumberStatus(targetNumber);
                    if (!status.registered) {
                        this.stats.targetStatus = 'banned';
                        this.emit('target_banned', {
                            reportNumber: i + 1,
                            details: status
                        });
                        break;
                    }
                }

                // Delay between reports
                await this.delay(delay);

            } catch (error) {
                this.stats.failed++;
                
                // Check if error indicates ban
                if (error.message.includes('blocked') || 
                    error.message.includes('not registered') ||
                    error.message.includes('failed')) {
                    
                    const status = await this.bot.checkNumberStatus(targetNumber);
                    if (!status.registered) {
                        this.stats.targetStatus = 'banned';
                        this.emit('target_banned', {
                            reportNumber: i + 1,
                            error: error.message,
                            details: status
                        });
                        break;
                    }
                }

                this.emit('report_error', {
                    attempt: i + 1,
                    error: error.message
                });

                // Shorter delay on error
                await this.delay(2000);
            }
        }

        this.isReporting = false;
        this.stats.endTime = new Date().toISOString();

        const result = {
            completed: true,
            cancelled: this.currentTask.cancelled,
            stats: this.stats,
            duration: this.calculateDuration(this.stats.startTime, this.stats.endTime)
        };

        this.emit('report_completed', result);
        this.currentTask = null;

        return result;
    }

    stopSpamReport() {
        if (this.currentTask) {
            this.currentTask.cancelled = true;
            this.isReporting = false;
            
            this.emit('report_stopped', {
                stats: this.stats,
                stoppedAt: new Date().toISOString()
            });
            
            return { success: true, message: 'Report stopped' };
        }
        
        return { error: 'No active report to stop' };
    }

    generateReportCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    calculateDuration(start, end) {
        if (!start || !end) return 'N/A';
        
        const startTime = new Date(start);
        const endTime = new Date(end);
        const diffMs = endTime - startTime;
        
        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    getReportStatus() {
        return {
            isReporting: this.isReporting,
            stats: this.stats,
            currentTask: this.currentTask
        };
    }
}

module.exports = WhatsAppReporter;
