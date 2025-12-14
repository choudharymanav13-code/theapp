'use client';

import { supabase } from '../../lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  }

  async function handleLogout() {
    const ok = confirm('Are you sure you want to log out?');
    if (!ok) return;

    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (loading) {
    return <div className="card">Loading profile…</div>;
  }

  if (!user) {
    return <div className="card small">Not signed in.</div>;
  }

  return (
    <div className="page">
      <h1>Profile</h1>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700 }}>Account</div>
        <div className="small">Email</div>
        <div>{user.email}</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <button
          className="btn danger"
          style={{ width: '100%' }}
          onClick={handleLogout}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
