'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const links = [
  { href: '/', label: 'Parse' },
  { href: '/candidates', label: 'Candidates' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/automations', label: 'Automations' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/project-matches', label: 'Project matches' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/audit', label: 'Audit' },
]

export default function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === '/login') return null;

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">ATS</Link>
      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="nav-link">
            {link.label}
          </Link>
        ))}
        <ThemeToggle className="nav-theme-toggle" />
        {session?.user && (
          <>
            <span className="nav-user">{session.user.name ?? session.user.email}</span>
            <button type="button" className="btn-secondary nav-signout" onClick={() => signOut({ callbackUrl: '/login' })}>
              Sign out
            </button>
          </>
        )}
      </div>
    </nav>
  );   
}

