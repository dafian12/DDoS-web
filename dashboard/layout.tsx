'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { HomeIcon, MagnifyingGlassIcon, ShieldCheckIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.cookie = `bug_key=daf12**; path=/`;
  }, []);
  const nav = [
    { label: 'Dashboard', icon: HomeIcon, href: '/dashboard' },
    { label: 'Subdomain Finder', icon: MagnifyingGlassIcon, href: '/dashboard/subfinder' },
    { label: 'Vuln Scanner', icon: ShieldCheckIcon, href: '/dashboard/vulnscan' },
    { label: 'Bug-Bounty Tools', icon: WrenchScrewdriverIcon, href: '/dashboard/bbtools' },
  ];
  return (
    <div className="drawer lg:drawer-open">
      <input id="drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content p-6">{children}</div>
      <div className="drawer-side">
        <ul className="menu p-4 w-64 bg-base-100 text-base-content">
          {nav.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="flex items-center gap-2">
                <n.icon className="w-5 h-5" />
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
