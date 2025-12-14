'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

function daysLeft(date) {
  const d = new Date(date);
  const now = new Date();
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase
      .from('items')
      .select('*')
      .order('expiry_date', { ascending: true });

    setItems(data || []);
    setLoading(false);
  }

  const useSoon = [];
  const pantry = [];
  const longLife = [];

  items.forEach(i => {
    const d = daysLeft(i.expiry_date);
    if (d <= 3) useSoon.push({ ...i, d });
    else if (d <= 7) pantry.push({ ...i, d });
    else longLife.push({ ...i, d });
  });

  function renderItem(i) {
    return (
      <div key={i.id} className={`inventory-card exp-${i.d <= 0 ? 'expired' : i.d <= 3 ? 'soon' : i.d <= 7 ? 'warn' : 'safe'}`}>
        <div>
          <div className="item-title">{i.name}</div>
          <div className="small">
            {i.quantity}{i.unit} • {i.calories_per_100g} kcal/100g
          </div>
          <div className="small">
            Exp: {new Date(i.expiry_date).toLocaleDateString()}
          </div>
        </div>
        <Link href="/add-item" className="btn">Edit</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Inventory</h1>

      {loading ? (
        <div className="card">Loading pantry…</div>
      ) : items.length === 0 ? (
        <div className="card small">Your pantry is empty.</div>
      ) : (
        <>
          {useSoon.length > 0 && (
            <>
              <h3 className="section-title">⚠️ Use Soon</h3>
              <div className="grid">{useSoon.map(renderItem)}</div>
            </>
          )}

          {pantry.length > 0 && (
            <>
              <h3 className="section-title">📦 Pantry</h3>
              <div className="grid">{pantry.map(renderItem)}</div>
            </>
          )}

          {longLife.length > 0 && (
            <>
              <h3 className="section-title">❄️ Long Life</h3>
              <div className="grid">{longLife.map(renderItem)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
