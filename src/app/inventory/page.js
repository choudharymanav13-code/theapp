'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

function daysBetween(a, b) {
  const one = new Date(a).setHours(0,0,0,0);
  const two = new Date(b).setHours(0,0,0,0);
  return Math.round((two - one) / (1000 * 60 * 60 * 24));
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadItems(); }, []);
  useEffect(() => {
    setFiltered(
      items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()))
    );
  }, [q, items]);

  async function loadItems() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data } = await supabase
      .from('items')
      .select('*')
      .order('expiry_date', { ascending: true });

    setItems(data || []);
    setFiltered(data || []);
    setLoading(false);
  }

  async function deleteItem(id, name) {
    if (!confirm(`Delete "${name}" from pantry?`)) return;
    await supabase.from('items').delete().eq('id', id);
    loadItems();
  }

  function expiryBadge(expiry) {
    if (!expiry) return { label: 'No expiry', color: '#6b7280' };
    const days = daysBetween(new Date(), new Date(expiry));
    if (days < 0) return { label: 'Expired', color: '#dc2626' };
    if (days <= 3) return { label: `Expiring in ${days}d`, color: '#f59e0b' };
    return { label: `Safe (${days}d)`, color: '#16a34a' };
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h1>Inventory</h1>
          <div className="small">Your pantry items</div>
        </div>
        <Link href="/add-item" className="btn primary">
          + Add item
        </Link>
      </div>

      {/* Search */}
      <input
        className="input"
        placeholder="Search items…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom:16 }}
      />

      {loading ? (
        <div className="card skeleton" style={{ height:120 }} />
      ) : filtered.length === 0 ? (
        <div className="card small">No items found.</div>
      ) : (
        <div style={{ display:'grid', gap:10 }}>
          {filtered.map(item => {
            const badge = expiryBadge(item.expiry_date);
            return (
              <div key={item.id} className="card"
                style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}
              >
                <div>
                  <div style={{ fontWeight:700 }}>{item.name}</div>
                  <div className="small">
                    {item.quantity}{item.unit} • {item.calories_per_100g} kcal/100g
                  </div>
                </div>

                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:badge.color }}>
                    {badge.label}
                  </div>
                  <button
                    className="small"
                    style={{ color:'#dc2626', marginTop:4 }}
                    onClick={() => deleteItem(item.id, item.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
