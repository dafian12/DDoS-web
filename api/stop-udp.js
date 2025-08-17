import { activeProcesses, cleanupProcess } from './send-udp';

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (activeProcesses.size === 0) {
      return res.status(400).json({ error: 'No active process' });
    }

    // Hentikan semua proses aktif
    for (const [id] of activeProcesses) {
      cleanupProcess(id);
    }

    res.status(200).json({ 
      success: true,
      message: 'All UDP processes stopped'
    });
  } catch (error) {
    console.error('Stop error:', error);
    res.status(500).json({ error: 'Failed to stop processes' });
  }
};
