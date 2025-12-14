'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();

    // 🔴 NOT LOGGED IN → GO TO LOGIN
    if (!user) {
      window.location.replace('/login');
      return;
    }

    setUser(user);

    // Pantry snapshot
    const { data: itemsData } = await supabase
      .from('items')
      .select('*')
      .order('expiry_date', { ascending: true })
      .limit(12);

    setItems(itemsData || []);

    // Recipe suggestions
    const invNames = (itemsData || []).map(i => i.name).slice(0, 20);
    if (invNames.length > 0) {
      const params = new URLSearchParams();
      invNames.forEach(n => params.append('inventory[]', n));
      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (res.ok) {
        const j = await res.json();
        setRecipes((j || []).slice(0, 4));
      }
    }

    setLoading(false);
  }

  if (loading) {
    return <div className="card">Loading dashboard…</div>;
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="row space-between">
        <div>
          <h1>Welcome 👋</h1>
          <div className="small">Your smart pantry & calorie coach</div>
        </div>
        <Link href="/add-item" className="btn primary">+ Add</Link>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="small">Quick actions</div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <Link href="/add-item" className="btn ghost">Manual</Link>
          <Link href="/add-item" className="btn ghost">Search</Link>
          <Link href="/add-item" className="btn ghost">Scan</Link>
        </div>
      </div>

      {/* Pantry snapshot */}
      <div style={{ marginTop: 20 }}>
        <div className="row space-between">
          <strong>Pantry snapshot</strong>
          <Link href="/inventory" className="small">View all</Link>
        </div>

        {items.length === 0 ? (
          <div className="card small" style={{ marginTop: 8 }}>
            Your pantry is empty.
          </div>
        ) : (
          <div className="card list" style={{ marginTop: 8 }}>
            {items.map(it => (
              <div key={it.id} className="list-item">
                <div>
                  <strong>{it.name}</strong>
                  <div className="small">
                    {it.quantity}{it.unit} • {it.calories_per_100g} kcal • Exp {new Date(it.expiry_date).toLocaleDateString()}
                  </div>
                </div>
                <span className="chevron">›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipes */}
      <div style={{ marginTop: 20 }}>
        <div className="row space-between">
          <strong>Suggested recipes</strong>
          <Link href="/recipes" className="small">See more</Link>
        </div>

        {recipes.length === 0 ? (
          <div className="card small" style={{ marginTop: 8 }}>
            Add more items to unlock recipes.
          </div>
        ) : (
          <div className="card list" style={{ marginTop: 8 }}>
            {recipes.map(r => (
              <div key={r.id} className="list-item">
                <div>
                  <strong>{r.title}</strong>
                  <div className="small">{r.cuisine} • {r.servings} servings</div>
                </div>
                <span className="chevron">›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Macros placeholder */}
      <div className="card" style={{ marginTop: 20 }}>
        <strong>Macros</strong>
        <div className="small">Daily macro tracking coming soon.</div>
      </div>
    </div>
  );
}
