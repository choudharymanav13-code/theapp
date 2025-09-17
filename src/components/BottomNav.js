'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function BottomNav() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!session) return null; // 🔴 Hides nav on login page

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#1f2937', display: 'flex', justifyContent: 'space-around',
      padding: '10px 0', borderTop: '1px solid #374151'
    }}>
      <Link href="/" style={{ color: '#f9fafb' }}>🏠 Home</Link>
      <Link href="/inventory" style={{ color: '#f9fafb' }}>📦 Inventory</Link>
      <Link href="/recipes" style={{ color: '#f9fafb' }}>🍲 Recipes</Link>
      <Link href="/log-meal" style={{ color: '#f9fafb' }}>🍽 Log Meal</Link>
      <Link href="/profile" style={{ color: '#f9fafb' }}>👤 Profile</Link>
    </nav>
  );
}
