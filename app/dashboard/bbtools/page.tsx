'use client';
import { useState } from 'react';
export default function BBTools() {
  const [host, setHost] = useState('');
  const [data, setData] = useState<any>(null);
  const run = async () => {
    const res = await fetch(`/api/bbtools?host=${encodeURIComponent(host)}`);
    setData(await res.json());
  };
  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">Bug-Bounty Toolkit</h2>
      <input className="input input-bordered w-full max-w-lg" placeholder="contoh.com" onChange={(e) => setHost(e.target.value)} />
      <button className="btn btn-accent ml-2" onClick={run}>Analyze</button>
      <pre className="mt-4 bg-neutral text-neutral-content p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
