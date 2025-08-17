// In-memory storage for active requests (shared with send-udp)
import { activeRequests } from './send-udp';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    if (activeRequests.size === 0) {
        return res.status(200).json({ success: false, error: 'No active requests to stop' });
    }

    // For simplicity, we'll stop the first active request
    // In a real app, you might want to track multiple requests
    const [requestId, requestData] = activeRequests.entries().next().value;
    
    clearTimeout(requestData.timeoutId);
    clearInterval(requestData.intervalId);
    requestData.client.close();
    activeRequests.delete(requestId);

    res.status(200).json({ success: true });
}
