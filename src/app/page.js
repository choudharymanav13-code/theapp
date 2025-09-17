'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('expiry_date', { ascending: true });

    if (!error) setItems(data || []);
    setLoading(false);
  }

  function totalCalories() {
    return items.reduce((sum, i) => {
      const qtyFactor = i.unit === 'g' || i.unit === 'ml'
        ? (i.quantity / 100)
        : i.quantity;
      return sum + (i.calories_per_100g || 0) * qtyFactor;
    }, 0);
  }

  function expiringSoon() {
    const today = new Date();
    const soon = new Date();
    soon.setDate(today.getDate() + 3);
    return items.filter(i => new Date(i.expiry_date) <= soon).length;
  }

  return (
    <div style={{ background: '#111827', minHeight: '100vh', color: '#f9fafb' }}>
      <div className="header" style={{ padding: '16px 20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Pantry Coach</h1>
      </div>

      <div className="content" style={{ padding: 20, display: 'grid', gap: 20 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
            <div className="small">📦 Total items</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{items.length}</div>
          </div>
          <div style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
            <div className="small">⏳ Expiring soon</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{expiringSoon()}</div>
          </div>
          <div style={{ background: '#1f2937', padding: 16, borderRadius: 12 }}>
            <div className="small">🔥 Pantry calories</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{totalCalories()}</div>
          </div>
        </div>

        {/* Actions */}
        <Link href="/add-item" className="btn primary" style={{ textAlign: 'center', background: '#2563eb', color: 'white', padding: '12px 16px', borderRadius: 8, textDecoration: 'none' }}>
          ➕ Add Item
        </Link>

        {/* Recent items */}
        <div style={{ background: '#1f2937', borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: 8 }}>Recent items</h2>
          {loading ? (
            <div className="small">Loading…</div>
          ) : items.length === 0 ? (
            <div className="small">No items yet. Add something!</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.slice(0, 5).map(i => (
                <li key={i.id} style={{ padding: '6px 0', borderBottom: '1px solid #374151' }}>
                  <div style={{ fontWeight: '500' }}>{i.name}</div>
                  <div className="small" style={{ color: '#9ca3af' }}>
                    {i.quantity}{i.unit} • {i.calories_per_100g} kcal/100g • Exp {i.expiry_date}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
