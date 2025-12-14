'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AddItemPage() {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [cal, setCal] = useState('');
  const [exp, setExp] = useState('');
  const [loading, setLoading] = useState(false);

  async function save(e) {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Not logged in');

    const { error } = await supabase.from('items').insert({
      user_id: user.id,
      name,
      quantity: Number(qty),
      unit,
      calories_per_100g: Number(cal),
      expiry_date: exp || null
    });

    setLoading(false);
    if (error) alert(error.message);
    else window.location.href = '/inventory';
  }

  return (
    <div>
      <h1>Add item</h1>
      <div className="small" style={{ marginBottom:16 }}>
        Add food to your pantry
      </div>

      <form className="card" onSubmit={save} style={{ display:'grid', gap:12 }}>
        <label className="label">Item name</label>
        <input className="input" required value={name} onChange={e=>setName(e.target.value)} />

        <div className="row">
          <div style={{ flex:2 }}>
            <label className="label">Quantity</label>
            <input className="input" type="number" required value={qty} onChange={e=>setQty(e.target.value)} />
          </div>
          <div style={{ flex:1 }}>
            <label className="label">Unit</label>
            <select className="input" value={unit} onChange={e=>setUnit(e.target.value)}>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="count">count</option>
            </select>
          </div>
        </div>

        <label className="label">Calories per 100g</label>
        <input className="input" type="number" required value={cal} onChange={e=>setCal(e.target.value)} />

        <label className="label">Expiry date (optional)</label>
        <input className="input" type="date" value={exp} onChange={e=>setExp(e.target.value)} />

        <button className="btn primary" disabled={loading}>
          {loading ? 'Saving…' : 'Save item'}
        </button>
      </form>
    </div>
  );
}
