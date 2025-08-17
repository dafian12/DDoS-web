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
    
    // Validasi input
    if (!ip || !port || !duration) {
      return res.status(400).json({ 
        error: 'Missing parameters',
        example: { ip: "192.168.1.1", port: 3000, duration: 60 }
      });
    }

    const client = dgram.createSocket('udp4');
    let packetsSent = 0;

    // Kirim response SUCCESS dulu
    res.status(200).json({ 
      success: true,
      message: `UDP started to ${ip}:${port}`
    });

    // Proses pengiriman
    const interval = setInterval(() => {
      client.send(`Packet ${++packetsSent}`, port, ip, (err) => {
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
};    clearInterval(interval);
    clearTimeout(timeout);
    client.close();
    activeProcesses.delete(id);
  }
}            activeRequests.get(requestId).intervalId = intervalId;
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Server error',
            message: error.message
        });
    }
}
