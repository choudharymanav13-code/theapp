// src/app/inventory/page.js
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Inventory() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setItems(data);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await supabase.from('items').delete().eq('id', id);
    load();
  };

  const macrosLine = (it) => {
    const kcal = it.calories_per_100g != null ? `${it.calories_per_100g} kcal/100g` : '— kcal';
    const p = it.protein_100g != null ? `P ${+Number(it.protein_100g).toFixed(1)}g` : 'P —g';
    const c = it.carbs_100g   != null ? `C ${+Number(it.carbs_100g).toFixed(1)}g`   : 'C —g';
    const f = it.fat_100g     != null ? `F ${+Number(it.fat_100g).toFixed(1)}g`     : 'F —g';
    return `${kcal} • ${p} ${c} ${f}`;
  };

  return (
    <>
      <div className="header"><h1>Inventory</h1></div>
      <div className="content">
        <div className="row" style={{ gap: 8 }}>
          <input className="input" placeholder="Search (e.g., dal, paneer) — coming soon" />
          <a className="btn primary" href="/add     <div className="space"></div>

        <div className="list">
          {items.map((it) => (
            <div key={it.id} className="list-item">
              <div>
                <div className="item-title">
                  {it.name} {it.brand ? <span className="badge" style={{ marginLeft: 6 }}>{it.brand}</span> : null}
                </div>
                <div className="item-sub">
                  {it.quantity} {it.unit} • {macrosLine(it)} • Exp: {it.expiry_date}
                </div>
              </div>
              <button className="btn danger" onClick={() => remove(it.id)}>Delete</button>
            </div>
          ))}
          {items.length === 0 && <div className="small">No items yet. Add your first item →</div>}
        </div>
      </div>
    </>
  );
}
