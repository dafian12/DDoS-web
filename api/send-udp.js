import dgram from 'dgram';

export default async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ip, port, duration } = req.body;
    
    if (!ip || !port || !duration) {
      return res.status(400).json({ 
        error: 'Missing parameters',
        required: ['ip', 'port', 'duration']
      });
    }

    // Send success response immediately
    res.status(200).json({ 
      success: true,
      message: `UDP started to ${ip}:${port}`
    });

    // Start UDP transmission
    const client = dgram.createSocket('udp4');
    let counter = 0;
    
    const interval = setInterval(() => {
      client.send(`Packet ${++counter}`, port, ip, (err) => {
        if (err) {
          console.error('UDP Error:', err);
          clearInterval(interval);
          client.close();
        }
      });
    }, 1000);

    // Auto-stop after duration
    setTimeout(() => {
      clearInterval(interval);
      client.close();
    }, duration * 1000);

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
