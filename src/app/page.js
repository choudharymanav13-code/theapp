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
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUser(user);

    const { data: itemsData } = await supabase
      .from('items')
      .select('*')
      .order('expiry_date', { ascending: true })
      .limit(6);

    setItems(itemsData || []);

    // Recipe suggestions
    const invNames = (itemsData || []).map(i => i.name);
    const params = new URLSearchParams();
    invNames.forEach(n => params.append('inventory[]', n));

    const res = await fetch(`/api/recipes?${params.toString()}`);
    if (res.ok) {
      const j = await res.json();
      setRecipes((j || []).slice(0, 3));
    }

    setLoading(false);
  }

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  return (
    <div>

      {/* 🔝 MINIMAL HEADER */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>Welcome, {firstName} 👋</h1>
            <div className="small">Your smart pantry & calorie coach</div>
          </div>

          <Link href="/add-item" className="btn primary">
            + Add
          </Link>
        </div>

        {/* 🔥 Calorie Placeholder */}
        <div
          className="card"
          style={{
            marginTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Today’s Calories</div>
            <div className="small">Personalised tracking coming soon</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, opacity: 0.6 }}>
            — kcal
          </div>
        </div>
      </div>

      {/* 🧺 PANTRY SNAPSHOT */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>Pantry snapshot</div>
          <Link href="/inventory" className="small">View all</Link>
        </div>

        {loading ? (
          <div className="card skeleton" style={{ height: 80 }} />
        ) : items.length === 0 ? (
          <div className="card small">Your pantry is empty.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {items.map(it => (
              <div
                key={it.id}
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{it.name}</div>
                  <div className="small">
                    {it.quantity}{it.unit} • {it.calories_per_100g} kcal • Exp{' '}
                    {it.expiry_date
                      ? new Date(it.expiry_date).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
                <span style={{ opacity: 0.6 }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🍳 SUGGESTED RECIPES */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>Suggested recipes</div>
          <Link href="/recipes" className="small">See more</Link>
        </div>

        {recipes.length === 0 ? (
          <div className="card small">Add more items to unlock recipes.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {recipes.map(r => (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div className="small">{r.cuisine} • {r.servings} servings</div>
                </div>
                <span style={{ opacity: 0.6 }}>›</span>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
