import dgram from 'dgram';

export default async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ip, port, duration } = req.body;
    
    if (!ip || !port || !duration) {
      return res.status(400).json({ 
        error: 'Missing parameters',
        details: 'Requires ip, port, and duration' 
      });
    }

    // Kirim response sukses dulu
    res.status(200).json({ 
      success: true,
      message: `UDP started to ${ip}:${port}`
    });

    // Proses pengiriman (background)
    const client = dgram.createSocket('udp4');
    let packetCount = 0;

    const interval = setInterval(() => {
      client.send(`Packet ${++packetCount}`, port, ip, (err) => {
        if (err) console.error('UDP Error:', err);
      });
    }, 1000);

    // Auto-stop setelah durasi
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
