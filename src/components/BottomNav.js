// src/components/BottomNav.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const [session, setSession] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  if (!session) return null; // hidden on login page

  const items = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/inventory', label: 'Inventory', icon: 'box' },
    { href: '/recipes', label: 'Recipes', icon: 'book' },
    { href: '/log-meal', label: 'Log Meal', icon: 'fork' },
    { href: '/profile', label: 'Profile', icon: 'user' },
  ];

  function Icon({ name, active }) {
    const stroke = active ? 'var(--accent)' : 'rgba(250,250,250,0.7)';
    const strokeW = 1.6;
    switch (name) {
      case 'home':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 10.5L12 3l9 7.5" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 21V11h14v10" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'box':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 16V8a2 2 0 0 0-1-1.73L13 3.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73L11 20.73a2 2 0 0 0 2 0l7-3.99A2 2 0 0 0 21 16z" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 6.5L12 9l5-2.5" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'book':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 19.5A2 2 0 0 1 5 18h13a2 2 0 0 1 2 2v-14a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14z" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 4.5v15" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'fork':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M7 2v7" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 2v7" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 11h10l2 2v6" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 11v10" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'user':
        return (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="7" r="4" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  }

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== '/' && pathname?.startsWith(it.href));
          return (
            <Link key={it.href} href={it.href} className={`nav-item ${active ? 'active' : ''}`} aria-label={it.label}>
              <div className="nav-icon"><Icon name={it.icon} active={active} /></div>
              <div className="nav-label">{it.label}</div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
