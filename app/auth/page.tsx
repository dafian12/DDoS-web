'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [key, setKey] = useState('');
  const router = useRouter();
  const handle = () => {
    if (key.trim() === 'daf12**') {
      localStorage.setItem('bug_key', key);
      router.push('/dashboard');
    } else alert('Invalid Key');
  };
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col">
        <h1 className="text-5xl font-bold">🔓 Bug-Hunter Suite</h1>
        <input
          type="password"
          placeholder="Enter key..."
          className="input input-bordered w-full max-w-xs"
          onChange={(e) => setKey(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handle}>Unlock</button>
      </div>
    </div>
  );
}
