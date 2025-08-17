import dgram from 'dgram';
import { v4 as uuidv4 } from 'uuid';

const activeRequests = new Map();

export default async function handler(req, res) {
    // Set header response sebagai JSON
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed',
            message: 'Only POST requests are allowed'
        });
    }

    try {
        const { ip, port, duration } = req.body;

        if (!ip || !port || !duration) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing parameters',
                message: 'IP, port and duration are required'
            });
        }

        const requestId = uuidv4();
        const client = dgram.createSocket('udp4');
        let packetsSent = 0;

        activeRequests.set(requestId, { client });

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                client.close();
                activeRequests.delete(requestId);
                res.status(200).json({ 
                    success: true, 
                    packetsSent,
                    duration: duration * 1000 
                });
                resolve();
            }, duration * 1000);

            const intervalId = setInterval(() => {
                const message = Buffer.from(`Packet ${packetsSent + 1}`);
                client.send(message, port, ip, (err) => {
                    if (err) {
                        clearTimeout(timeoutId);
                        clearInterval(intervalId);
                        client.close();
                        activeRequests.delete(requestId);
                        res.status(500).json({ 
                            success: false, 
                            error: 'Send failed',
                            message: err.message
                        });
                        resolve();
                    }
                    packetsSent++;
                });
            }, 1000);

            activeRequests.get(requestId).timeoutId = timeoutId;
            activeRequests.get(requestId).intervalId = intervalId;
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message
        });
    }
}
