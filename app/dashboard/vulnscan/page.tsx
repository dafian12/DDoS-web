'use client';
import { useState } from 'react';
export default function VulnScan() {
  const [url, setUrl] = useState('');
  const [res, setRes] = useState<any>(null);
  const scan = async () => {
    const r = await fetch('/api/vulnscan', {
      method: 'POST',
      body: JSON.stringify({ url }),
      headers: { 'Content-Type': 'application/json' },
    });
    setRes(await r.json());
  };
  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">Web Vuln Scanner</h2>
      <input className="input input-bordered w-full max-w-lg" placeholder="https://target.com" onChange={(e) => setUrl(e.target.value)} />
      <button className="btn btn-secondary ml-2" onClick={scan}>Scan</button>
      <pre className="mt-4 bg-neutral text-neutral-content p-4 rounded">{JSON.stringify(res, null, 2)}</pre>
    </div>
  );
}
