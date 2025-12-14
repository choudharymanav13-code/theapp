'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
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

    const { data: itemsData } = await supabase
      .from('items')
      .select('*')
      .order('expiry_date', { ascending: true })
      .limit(6);

    setItems(itemsData || []);

    const invNames = (itemsData || []).map(i => i.name);
    const params = new URLSearchParams();
    invNames.forEach(n => params.append('inventory[]', n));

    const res = await fetch(`/api/recipes?${params.toString()}`);
    if (res.ok) {
      const j = await res.json();
      setRecipes(j.slice(0, 3));
    }

    setLoading(false);
  }

  return (
    <div className="container">
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Welcome 👋</h1>
          <div className="small">Your smart pantry & calorie coach</div>
        </div>
        <Link href="/add-item" className="btn primary">+ Add</Link>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ marginTop: 16 }} className="quick-actions">
        <Link href="/add-item" className="btn">Manual</Link>
        <Link href="/add-item" className="btn">Search</Link>
        <Link href="/add-item" className="btn">Scan</Link>
      </div>

      {/* PANTRY */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>Pantry snapshot</strong>
          <Link href="/inventory" className="small">View all</Link>
        </div>

        <div className="card">
          {loading ? (
            <>
              <div className="skeleton" />
              <div className="skeleton" style={{ width: '60%' }} />
            </>
          ) : items.length === 0 ? (
            <div className="small">Your pantry is empty.</div>
          ) : (
            <div className="list">
              {items.map(it => (
                <div key={it.id} className="list-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    <div className="small">
                      {it.quantity}{it.unit} • {it.calories_per_100g} kcal • Exp {new Date(it.expiry_date).toLocaleDateString()}
                    </div>
                  </div>
                  <Link href="/inventory" className="chevron">›</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECIPES */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>Suggested recipes</strong>
          <Link href="/recipes" className="small">See more</Link>
        </div>

        <div className="card">
          {recipes.length === 0 ? (
            <div className="small">Add more items to unlock recipes.</div>
          ) : (
            <div className="list">
              {recipes.map(r => (
                <div key={r.id} className="list-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div className="small">{r.cuisine} • {r.servings} servings</div>
                  </div>
                  <Link href={`/recipes/${r.id}`} className="chevron">›</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MACROS PLACEHOLDER */}
      <div style={{ marginTop: 22 }} className="card">
        <strong>Macros</strong>
        <div className="small">Daily macro tracking coming soon.</div>
      </div>
    </div>
  );
}
