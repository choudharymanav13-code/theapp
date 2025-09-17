'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const [session, setSession] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysWindow, setDaysWindow] = useState(7); // adjustable expiring soon window

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
  }, [session, daysWindow]);

  async function loadInventory() {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setInventory(data);
      // filter items expiring soon based on adjustable window
      const soon = data.filter(i => {
        const daysLeft = (new Date(i.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
        return daysLeft >= 0 && daysLeft <= daysWindow;
      });
      setExpiringSoon(soon);
    }
    setLoading(false);
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
    <div className="dashboard" style={{ padding: '16px', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>👋 Welcome back</h1>
      <p className="small" style={{ marginBottom: '20px' }}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <StatCard label="Inventory" value={loading ? '—' : inventory.length} />
        <StatCard label="Expiring Soon" value={loading ? '—' : expiringSoon.length} />
        <StatCard label="Calories Today" value="—" />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <a href="/add-item" className="btn primary" style={{ flex: 1, textAlign: 'center' }}>➕ Add Item</a>
        <a href="/recipes" className="btn" style={{ flex: 1, textAlign: 'center' }}>🍲 Recipes</a>
        <a href="/log-meal" className="btn" style={{ flex: 1, textAlign: 'center' }}>🍽 Log Meal</a>
      </div>

      {/* Expiring soon */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px' }}>⚠️ Expiring Soon</h2>
          <select
            className="input"
            style={{ width: 'auto', fontSize: '12px', padding: '2px 6px' }}
            value={daysWindow}
            onChange={(e) => setDaysWindow(Number(e.target.value))}
          >
            <option value={3}>Next 3 days</option>
            <option value={5}>Next 5 days</option>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
          </select>
        </div>
        {loading ? (
          <SkeletonList count={2} />
        ) : expiringSoon.length > 0 ? (
          <div className="list" style={{ marginTop: 8 }}>
            {expiringSoon.map(item => (
              <div key={item.id} className="list-item">
                <div>
                  <div className="item-title">{item.name}</div>
                  <div className="item-sub">
                    Expires {new Date(item.expiry_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="small">No items expiring soon 🎉</p>
        )}
      </div>

      {/* Recently added */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px' }}>🆕 Recently Added</h2>
          <a href="/inventory" className="small">View All →</a>
        </div>
        {loading ? (
          <SkeletonList count={3} />
        ) : inventory.length > 0 ? (
          <div className="list" style={{ marginTop: 8 }}>
            {inventory.map(item => (
              <div key={item.id} className="list-item">
                <div>
                  <div className="item-title">{item.name}</div>
                  <div className="item-sub">
                    {item.calories_per_100g} kcal/100g • Expires {new Date(item.expiry_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="small">No items yet. Add your first one!</p>
        )}
      </div>

      {/* Recipes teaser */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px' }}>🍲 Suggested Recipes</h2>
        <div className="card" style={{ marginTop: 8 }}>
          <p className="small">Recipe suggestions will appear here (Phase 4).  
          Based on your inventory, we’ll show Indian + global dishes you can cook.</p>
          <a href="/recipes" className="btn primary" style={{ marginTop: 10 }}>Explore Recipes</a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '12px', borderRadius: '12px' }}>
      <div className="small">{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

function SkeletonList({ count = 3 }) {
  return (
    <div className="list" style={{ marginTop: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '40px' }} />
      ))}
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
