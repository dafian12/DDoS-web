import dgram from 'dgram';

export default async (req, res) => {
  // Set CORS and JSON headers FIRST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Only POST requests allowed' 
      });
    }

    // Parse JSON body
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { ip, port, duration } = JSON.parse(body);
        
        if (!ip || !port || !duration) {
          return res.status(400).json({ 
            error: 'Missing parameters',
            required: { ip: 'string', port: 'number', duration: 'number' }
          });
        }

        // Send success response
        res.status(200).json({ 
          success: true,
          message: `UDP started to ${ip}:${port}`,
          duration: `${duration} seconds`
        });

        // Start UDP process
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

        setTimeout(() => {
          clearInterval(interval);
          client.close();
        }, duration * 1000);

      } catch (error) {
        console.error('Parse Error:', error);
        return res.status(400).json({ 
          error: 'Invalid JSON format',
          details: error.message 
        });
      }
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
