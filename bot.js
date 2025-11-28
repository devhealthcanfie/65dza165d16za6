const { createClient } = require('bedrock-protocol');

const accounts = [
    { username: "BOT1", profilePath: "./profiles/BOT1" },
    { username: "BOT2", profilePath: "./profiles/BOT2" }, 
    { username: "BOT3", profilePath: "./profiles/BOT3" },
    { username: "BOT4", profilePath: "./profiles/BOT4" },
    { username: "BOT5", profilePath: "./profiles/BOT5" }
];

console.log('🎮 BEDROCK AFK Bot - FULL ROTATION EVERY 30MIN\n');

// Global error handling
process.on('uncaughtException', (err) => {
    const ignoreErrors = [
        'Invalid tag', 'Read error', 'sendto', 'SizeOf error', 
        'Missing characters', 'Unexpected field'
    ];
    
    if (ignoreErrors.some(pattern => err.message.includes(pattern))) {
        return;
    }
    console.log('⚠️  Unhandled error:', err.message);
});

process.on('unhandledRejection', () => {});

class StableBot {
    constructor(account) {
        this.account = account;
        this.client = null;
        this.reconnectTimeout = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.lastConnectTime = 0;
    }

    start() {
        console.log(`🔌 Starting ${this.account.username}...`);
        this.connect();
    }

    connect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.lastConnectTime = Date.now();
        this.connectionAttempts++;

        try {
            console.log(`🔗 ${this.account.username} connecting... (attempt ${this.connectionAttempts})`);
            
            this.client = createClient({
                host: 'donutsmp.net',
                port: 19132,
                username: this.account.username,
                profilesFolder: this.account.profilePath,
                skipPing: true,
                connectTimeout: 45000,
                onMsaAuthCode: () => {}
            });

            this.client.once('spawn', () => {
                this.isConnected = true;
                this.connectionAttempts = 0;
                console.log(`✅ ${this.account.username} - AFK ACTIVE`);
            });

            this.client.once('kick', (reason) => {
                const reasonText = this.getReason(reason);
                this.handleDisconnect(`kicked: ${reasonText}`);
            });

            this.client.once('disconnect', (reason) => {
                const reasonText = this.getReason(reason);
                this.handleDisconnect(`disconnected: ${reasonText}`);
            });

            this.client.on('error', (err) => {
                if (!err.message.includes('sendto')) {
                    console.log(`⚠️  ${this.account.username} error: ${err.message}`);
                }
            });

            // Safety timeout
            setTimeout(() => {
                if (!this.isConnected && this.client) {
                    console.log(`⏰ ${this.account.username} connection timeout`);
                    this.handleDisconnect('timeout');
                }
            }, 60000);

        } catch (error) {
            console.log(`❌ ${this.account.username} connection failed: ${error.message}`);
            this.scheduleReconnect();
        }
    }

    // Rotate method - disconnect and then reconnect
    rotate() {
        if (this.isConnected && this.client) {
            console.log(`🔄 ROTATION: ${this.account.username} cycling connection...`);
            // Disconnect and then schedule reconnect
            this.handleDisconnect('rotation');
            // Schedule reconnect after a short delay
            setTimeout(() => {
                console.log(`🔄 ROTATION: ${this.account.username} reconnecting after rotation...`);
                this.connect();
            }, 5000); // 5 second delay before reconnecting
        } else {
            console.log(`🔄 ROTATION: ${this.account.username} not connected, starting...`);
            this.connect();
        }
    }

    getReason(reason) {
        if (typeof reason === 'string') return reason;
        if (reason?.message) return reason.message;
        if (reason?.params?.message) return reason.params.message;
        if (reason?.params?.reason) return reason.params.reason;
        return 'unknown reason';
    }

    handleDisconnect(reason) {
        if (this.isConnected) {
            this.isConnected = false;
            console.log(`🔌 ${this.account.username} ${reason}`);
        }

        if (this.client) {
            try {
                this.client.removeAllListeners();
                this.client.close();
            } catch (e) {}
            this.client = null;
        }

        // Only auto-reconnect if it's NOT a rotation (rotations handle their own reconnection)
        if (!reason.includes('rotation')) {
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        const baseDelay = 10000;
        const maxDelay = 300000;
        const exponentialDelay = Math.min(baseDelay * Math.pow(1.5, this.connectionAttempts), maxDelay);
        const jitter = Math.random() * 5000;
        const delay = exponentialDelay + jitter;

        console.log(`⏳ ${this.account.username} reconnecting in ${Math.round(delay/1000)}s...`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    stop() {
        console.log(`🛑 Stopping ${this.account.username}`);
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.client) {
            try {
                this.client.removeAllListeners();
                this.client.close();
            } catch (e) {}
            this.client = null;
        }
    }
}

// Rotation manager
class RotationManager {
    constructor(bots) {
        this.bots = bots;
        this.rotationInterval = null;
        this.rotationSequence = [2, 0, 3, 1, 4]; // BOT3, BOT1, BOT4, BOT2, BOT5
        this.rotationCount = 1;
        this.rotationDelay = 30000; // 30 seconds between each bot in the sequence
    }

    startRotation() {
        console.log('\n🔄 STARTING FULL ROTATION EVERY 30 MINUTES');
        console.log('Each rotation: BOT3 → BOT1 → BOT4 → BOT2 → BOT5 (with 30s delays)');
        console.log('Full rotation completes in 2.5 minutes, then repeats every 30 minutes\n');
        
        // Start first rotation after 2 minutes (so all bots are connected first)
        setTimeout(() => {
            this.startFullRotation();
        }, 120000);
        
        // Then every 30 minutes
        this.rotationInterval = setInterval(() => {
            this.startFullRotation();
        }, 30 * 60 * 1000); // 30 minutes
    }

    startFullRotation() {
        console.log(`\n🔄 FULL ROTATION #${this.rotationCount} STARTING`);
        console.log('=' .repeat(40));
        
        // Rotate all bots in sequence with delays
        this.rotationSequence.forEach((botIndex, sequenceIndex) => {
            const delay = sequenceIndex * this.rotationDelay; // 0s, 30s, 60s, 90s, 120s
            
            setTimeout(() => {
                const bot = this.bots[botIndex];
                const botName = bot.account.username;
                
                console.log(`\n🔄 Rotating ${botName}...`);
                bot.rotate();
                
                // If this is the last bot in sequence, show completion message
                if (sequenceIndex === this.rotationSequence.length - 1) {
                    setTimeout(() => {
                        console.log(`\n✅ FULL ROTATION #${this.rotationCount} COMPLETED`);
                        this.showStatus();
                        this.rotationCount++;
                        
                        // Show next rotation time
                        const nextRotation = new Date(Date.now() + (30 * 60 * 1000));
                        console.log(`⏭️  Next full rotation: ${nextRotation.toLocaleTimeString()}`);
                    }, 10000);
                }
            }, delay);
        });
    }

    showStatus() {
        const connected = this.bots.filter(bot => bot.isConnected).length;
        console.log(`📊 Current status: ${connected}/${this.bots.length} bots connected`);
    }

    stop() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
            this.rotationInterval = null;
        }
    }
}

// Main execution
const bots = [];
const botMap = new Map();

console.log('🚀 Initial bot startup sequence:\n');

// Start all bots with staggered delays
accounts.forEach((account, index) => {
    setTimeout(() => {
        const bot = new StableBot(account);
        bots.push(bot);
        botMap.set(account.username, bot);
        bot.start();
        
        // Start rotation manager after all bots are initialized
        if (index === accounts.length - 1) {
            setTimeout(() => {
                const rotationManager = new RotationManager(bots);
                rotationManager.startRotation();
                
                // Store for cleanup
                global.rotationManager = rotationManager;
                
                // Show initial status
                setTimeout(() => {
                    console.log('\n📊 INITIAL STATUS: All bots connected and ready');
                    rotationManager.showStatus();
                    
                    const firstRotation = new Date(Date.now() + 120000);
                    console.log(`🔄 First full rotation starts at: ${firstRotation.toLocaleTimeString()}`);
                }, 30000);
            }, 20000);
        }
    }, index * 8000); // 8 second stagger
});

// Status monitoring (less frequent since we have rotation status)
setInterval(() => {
    const connected = bots.filter(bot => bot.isConnected).length;
    console.log(`\n📊 HEARTBEAT: ${connected}/${bots.length} bots connected`);
}, 300000); // Every 5 minutes

// Handle exit cleanly
process.on('SIGINT', () => {
    console.log('\n🛑 Received shutdown signal...');
    console.log('Stopping all bots and rotation...');
    
    if (global.rotationManager) {
        global.rotationManager.stop();
    }
    
    bots.forEach(bot => bot.stop());
    
    setTimeout(() => {
        console.log('✅ All bots stopped. Goodbye!');
        process.exit(0);
    }, 2000);
});

process.on('exit', () => {
    if (global.rotationManager) {
        global.rotationManager.stop();
    }
    bots.forEach(bot => {
        try { bot.stop(); } catch (e) {}
    });
});