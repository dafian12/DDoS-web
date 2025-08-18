'use client';
import { useState } from 'react';
export default function SubFinder() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<any>(null);
  const scan = async () => {
    const res = await fetch(`/api/subfinder?domain=${encodeURIComponent(domain)}`);
    setResult(await res.json());
  };
  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">Subdomain Finder</h2>
      <input className="input input-bordered w-full max-w-xs" placeholder="contoh.com" onChange={(e) => setDomain(e.target.value)} />
      <button className="btn btn-primary ml-2" onClick={scan}>Scan</button>
      <pre className="mt-4 bg-neutral text-neutral-content p-4 rounded">{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
