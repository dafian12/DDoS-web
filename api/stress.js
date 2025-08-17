export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ip, port, duration } = req.body;

    // Validasi input
    if (!ip || !port || !duration) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (port < 1 || port > 65535) {
        return res.status(400).json({ error: 'Invalid port number' });
    }

    const validDurations = [60, 90, 120];
    if (!validDurations.includes(parseInt(duration))) {
        return res.status(400).json({ error: 'Invalid duration' });
    }

    try {
        // Simulasi UDP stress test
        const dgram = await import('dgram');
        const client = dgram.createSocket('udp4');
        
        let packetsSent = 0;
        const startTime = Date.now();
        const durationMs = parseInt(duration) * 1000;
        
        const message = Buffer.from('stress-test-packet');
        
        // Kirim packet setiap 100ms
        const interval = setInterval(() => {
            if (Date.now() - startTime > durationMs) {
                clearInterval(interval);
                client.close();
                return res.json({ 
                    packets: packetsSent,
                    duration: parseInt(duration),
                    target: `${ip}:${port}`
                });
            }
            
            client.send(message, port, ip, (error) => {
                if (!error) {
                    packetsSent++;
                }
            });
        }, 100);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
