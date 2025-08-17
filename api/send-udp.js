import dgram from 'dgram';

export default async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        // Handle OPTIONS preflight
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Only allow POST requests
        if (req.method !== 'POST') {
            return res.status(405).json({ 
                error: 'Method not allowed',
                allowed: ['POST']
            });
        }

        const { ip, port, duration } = req.body;
        
        // Validate required parameters
        if (!ip || !port || !duration) {
            return res.status(400).json({ 
                error: 'Bad request',
                required: ['ip', 'port', 'duration'],
                example: {
                    ip: "192.168.1.1",
                    port: 3000,
                    duration: 60
                }
            });
        }

        // Send success response immediately
        res.status(200).json({ 
            status: 'started',
            target: `${ip}:${port}`,
            duration: `${duration} seconds`,
            message: 'UDP transmission started'
        });

        // Start UDP transmission in background
        const client = dgram.createSocket('udp4');
        let packetCount = 0;

        const interval = setInterval(() => {
            const message = Buffer.from(`UDP-Packet-${++packetCount}-${Date.now()}`);
            client.send(message, port, ip, (err) => {
                if (err) {
                    console.error('UDP Send Error:', err);
                    clearInterval(interval);
                    client.close();
                }
            });
        }, 1000);

        // Auto-stop after duration
        setTimeout(() => {
            clearInterval(interval);
            client.close();
            console.log(`UDP transmission to ${ip}:${port} completed`);
        }, duration * 1000);

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
};
