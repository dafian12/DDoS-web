// Global variable to track active processes
const activeProcesses = new Map();

export default async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ 
                error: 'Method not allowed',
                allowed: ['POST']
            });
        }

        // In a real implementation, you would track and stop active processes
        // This is a simplified version
        let stoppedCount = 0;
        
        activeProcesses.forEach((process, id) => {
            clearInterval(process.interval);
            process.client.close();
            activeProcesses.delete(id);
            stoppedCount++;
        });

        return res.status(200).json({ 
            status: 'success',
            stopped: stoppedCount,
            message: stoppedCount > 0 
                ? `Stopped ${stoppedCount} active transmission(s)`
                : 'No active transmissions to stop'
        });

    } catch (error) {
        console.error('Stop Error:', error);
        return res.status(500).json({ 
            error: 'Failed to stop transmission',
            details: error.message
        });
    }
};
