// Tell Vercel to run this in Node, not Edge
export const config = {
  runtime: 'nodejs18.x',
};

import dgram from 'node:dgram';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ip, port, duration } = req.body;

  // basic validation
  if (!ip || !port || ![60, 90, 120].includes(Number(duration))) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  const client = dgram.createSocket('udp4');
  const payload = Buffer.from('stress');      // small UDP payload
  const stopAt = Date.now() + Number(duration) * 1000;
  let packets = 0;

  const iv = setInterval(() => {
    if (Date.now() > stopAt) {
      clearInterval(iv);
      client.close();
      return res.json({ packets, duration: Number(duration), target: `${ip}:${port}` });
    }

    client.send(payload, Number(port), ip, (err) => {
      if (!err) packets++;
    });
  }, 50);   // ~20 pps – tune to your needs
}
