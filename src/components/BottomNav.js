'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function BottomNav() {
  const [session, setSession] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sess) => setSession(sess)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🔒 Hide bottom nav if not logged in (login page)
  if (!session) return null;

  const tabs = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/inventory', label: 'Inventory', icon: '📦' },
    { href: '/recipes', label: 'Recipes', icon: '📖' },
    { href: '/log-meal', label: 'Log', icon: '🍽️' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`bottom-tab ${active ? 'active' : ''}`}
          >
            <span className="icon">{tab.icon}</span>
            {active && <span className="label">{tab.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
