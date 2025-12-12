// src/app/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    loadUserAndData();
  }, []);

  async function loadUserAndData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUser(null); setLoading(false); return; }
    setUser(user);

    const { data:itemsData } = await supabase.from('items').select('*').order('expiry_date', { ascending: true }).limit(12);
    setItems(itemsData || []);

    // fetch quick recipe suggestions (inventory names)
    const invNames = (itemsData || []).map(i => i.name).slice(0, 20);
    const params = new URLSearchParams();
    invNames.forEach(n => params.append('inventory[]', n));
    const res = await fetch(`/api/recipes?${params.toString()}`);
    if (res.ok) {
      const j = await res.json();
      setRecipes((j || []).slice(0, 4));
    } else {
      setRecipes([]);
    }

    setLoading(false);
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1>Welcome</h1>
          <div className="small">Smart pantry & calorie companion</div>
        </div>
        <div>
          <Link href="/add-item" className="btn primary">Quick Add</Link>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {/* Quick actions */}
      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>Quick actions</div>
          <div className="small">Manual add, search, or scan a barcode.</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link href="/add-item" className="btn">Manual</Link>
          <Link href="/add-item" className="btn">Search</Link>
          <Link href="/add-item" className="btn">Scan</Link>
        </div>
      </div>

      {/* Pantry snapshot */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontWeight:700 }}>Pantry snapshot</div>
          <Link href="/inventory" className="small">View all</Link>
        </div>
        {loading ? (
          <div className="card" style={{ display:'grid', gap:10 }}>
            <div className="skeleton" style={{ width:'60%' }}></div>
            <div className="skeleton" style={{ width:'40%' }}></div>
          </div>
        ) : items.length === 0 ? (
          <div className="card small">Your pantry is empty. Add something to get suggestions.</div>
        ) : (
          <div style={{ display:'grid', gap:8 }}>
            {items.map(it => (
              <div key={it.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:700 }}>{it.name}</div>
                  <div className="small">{it.quantity}{it.unit} • {it.calories_per_100g} kcal/100g • Exp: {it.expiry_date ? new Date(it.expiry_date).toLocaleDateString() : '—'}</div>
                </div>
                <div>
                  <Link href={`/inventory`} className="btn">Manage</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick recipe suggestions */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontWeight:700 }}>Suggested recipes</div>
          <Link href="/recipes" className="small">See more</Link>
        </div>
        <div style={{ display:'grid', gap:12 }}>
          {recipes.length === 0 ? (
            <div className="card small">No suggestions yet. Add staples to your pantry to get suggestions.</div>
          ) : recipes.map(r => (
            <div key={r.id} className="card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700 }}>{r.title}</div>
                <div className="small">{r.cuisine} • {r.servings} servings</div>
              </div>
              <div>
                <Link href={`/recipes/${r.id}`} className="btn">View</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* macro placeholder */}
      <div style={{ marginTop: 18 }} className="card">
        <div style={{ fontWeight:700 }}>Macros (placeholder)</div>
        <div className="small">Daily macro targets and logs will appear here (coming soon).</div>
      </div>
    </div>
  );
}
