'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const [session, setSession] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadInventory();
  }, [session]);

  async function loadInventory() {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setInventory(data);
      // filter items expiring in next 7 days
      const soon = data.filter(i => {
        const daysLeft = (new Date(i.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
        return daysLeft >= 0 && daysLeft <= 7;
      });
      setExpiringSoon(soon);
    }
  }

  if (!session) {
    // show login page
    return (
      <div className="card" style={{ marginTop: 80 }}>
        <h2>Login</h2>
        <p>Enter your email to receive a magic link.</p>
        <LoginForm />
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="dashboard" style={{ padding: '16px', color: '#f9fafb', background: '#111827', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>
        👋 Welcome back
      </h1>
      <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div className="card" style={{ background: '#1f2937', padding: '12px', borderRadius: '12px' }}>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>Inventory</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{inventory.length}</div>
        </div>
        <div className="card" style={{ background: '#1f2937', padding: '12px', borderRadius: '12px' }}>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>Expiring Soon</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{expiringSoon.length}</div>
        </div>
        <div className="card" style={{ background: '#1f2937', padding: '12px', borderRadius: '12px' }}>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>Calories Today</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>—</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <a href="/add-item" className="btn primary" style={{ flex: 1, textAlign: 'center' }}>➕ Add Item</a>
        <a href="/recipes" className="btn" style={{ flex: 1, textAlign: 'center' }}>🍲 Recipes</a>
        <a href="/log-meal" className="btn" style={{ flex: 1, textAlign: 'center' }}>🍽 Log Meal</a>
      </div>

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>⚠️ Expiring Soon</h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            {expiringSoon.map(item => (
              <div key={item.id} style={{ background: '#1f2937', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Expires on {new Date(item.expiry_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently added */}
      <div>
        <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>🆕 Recently Added</h2>
        <div style={{ display: 'grid', gap: '8px' }}>
          {inventory.map(item => (
            <div key={item.id} style={{ background: '#1f2937', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold' }}>{item.name}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                {item.calories_per_100g} kcal/100g • Expires {new Date(item.expiry_date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Minimal login form (client-side email magic link)
function LoginForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else setSent(true);
  }

  if (sent) return <p>✅ Check your email for the magic link!</p>;

  return (
    <form onSubmit={handleLogin} style={{ display: 'grid', gap: '10px' }}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        className="input"
      />
      <button type="submit" className="btn primary">Send Magic Link</button>
    </form>
  );
}
