import dgram from 'dgram';

// Simpan state pengiriman
const activeProcesses = new Map();

export default async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ip, port, duration } = req.body;
    
    // Validasi input
    if (!ip || !port || !duration) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const client = dgram.createSocket('udp4');
    const processId = Date.now();
    let packetsSent = 0;

    // Kirim response langsung (tidak menunggu proses UDP selesai)
    res.status(200).json({ 
      success: true,
      message: 'UDP process started'
    });

    // Simpan proses aktif
    activeProcesses.set(processId, {
      client,
      interval: null,
      timeout: null
    });

    // Mulai pengiriman paket
    const interval = setInterval(() => {
      const message = Buffer.from(`Packet ${++packetsSent}`);
      client.send(message, port, ip, (err) => {
        if (err) console.error('UDP send error:', err);
      });
    }, 1000);

    // Auto-stop setelah durasi habis
    const timeout = setTimeout(() => {
      cleanupProcess(processId);
    }, duration * 1000);

    // Update proses aktif
    activeProcesses.get(processId).interval = interval;
    activeProcesses.get(processId).timeout = timeout;

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Fungsi cleanup
function cleanupProcess(id) {
  if (activeProcesses.has(id)) {
    const { client, interval, timeout } = activeProcesses.get(id);
    clearInterval(interval);
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
