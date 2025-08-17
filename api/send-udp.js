import dgram from 'dgram';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for active requests
const activeRequests = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { ip, port, duration } = req.body;

    // Validate input
    if (!ip || !port || !duration) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    // Generate unique ID for this request
    const requestId = uuidv4();

    // Create UDP client
    const client = dgram.createSocket('udp4');
    let timeoutId;
    let intervalId;
    let packetsSent = 0;

    // Store the request info for potential stopping
    activeRequests.set(requestId, {
        client,
        timeoutId: null,
        intervalId: null
    });

    // Function to clean up
    const cleanup = () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        client.close();
        activeRequests.delete(requestId);
    };

    return new Promise((resolve) => {
        // Set timeout for total duration
        timeoutId = setTimeout(() => {
            cleanup();
            res.status(200).json({ 
                success: true, 
                packetsSent,
                duration: duration * 1000 
            });
            resolve();
        }, duration * 1000);

        // Send packets (1 per second to keep it simple)
        intervalId = setInterval(() => {
            const message = Buffer.from(`Packet ${packetsSent + 1} at ${new Date().toISOString()}`);
            client.send(message, port, ip, (err) => {
                if (err) {
                    console.error('Error sending packet:', err);
                    cleanup();
                    res.status(500).json({ 
                        success: false, 
                        error: 'Failed to send packet',
                        packetsSent
                    });
                    resolve();
                } else {
                    packetsSent++;
                }
            });
        }, 1000);

        // Update the stored timeout/interval IDs
        activeRequests.get(requestId).timeoutId = timeoutId;
        activeRequests.get(requestId).intervalId = intervalId;
    });
                                 }
