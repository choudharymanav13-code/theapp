// src/app/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndData();
  }, []);

  async function loadUserAndData() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    // 🔒 HARD AUTH GUARD
    if (!user) {
      router.replace('/login');
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
    return (
      <div className="content">
        <div className="card skeleton" style={{ height: 120 }} />
        <div className="card skeleton" style={{ height: 120, marginTop: 12 }} />
      </div>
    );
  }

  return (
    <div className="content">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1>Welcome</h1>
          <div className="small">Smart pantry & calorie companion</div>
        </div>
        <Link href="/add-item" className="btn primary">Quick Add</Link>
      </div>

      <div style={{ height: 12 }} />

      {/* Quick actions */}
      <div className="card" style={{ display:'flex', gap:12, alignItems:'center' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700 }}>Quick actions</div>
          <div className="small">Manual add, search, or scan barcode</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link href="/add-item" className="btn">Manual</Link>
          <Link href="/add-item" className="btn">Search</Link>
          <Link href="/add-item" className="btn">Scan</Link>
        </div>
      </div>

      {/* Pantry snapshot */}
      <div style={{ marginTop:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontWeight:700 }}>Pantry snapshot</div>
          <Link href="/inventory" className="small">View all</Link>
        </div>

        {items.length === 0 ? (
          <div className="card small">Your pantry is empty. Add items to get started.</div>
        ) : (
          <div style={{ display:'grid', gap:8 }}>
            {items.map(it => (
              <div key={it.id} className="card" style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700 }}>{it.name}</div>
                  <div className="small">
                    {it.quantity}{it.unit} • {it.calories_per_100g} kcal/100g • Exp: {it.expiry_date
                      ? new Date(it.expiry_date).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
                <Link href="/inventory" className="btn">Manage</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipe suggestions */}
      <div style={{ marginTop:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ fontWeight:700 }}>Suggested recipes</div>
          <Link href="/recipes" className="small">See more</Link>
        </div>

        {recipes.length === 0 ? (
          <div className="card small">Add staples to get recipe suggestions.</div>
        ) : (
          <div style={{ display:'grid', gap:12 }}>
            {recipes.map(r => (
              <div key={r.id} className="card" style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700 }}>{r.title}</div>
                  <div className="small">{r.cuisine} • {r.servings} servings</div>
                </div>
                <Link href={`/recipes/${r.id}`} className="btn">View</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Macros placeholder */}
      <div style={{ marginTop:18 }} className="card">
        <div style={{ fontWeight:700 }}>Macros (coming soon)</div>
        <div className="small">Daily macro tracking will appear here.</div>
      </div>
    </div>
  );
}
