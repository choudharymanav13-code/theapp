'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function LogMealPage() {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [deduct, setDeduct] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Not logged in');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/log-meal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        calories: Number(calories),
        notes,
        deduct
      })
    });

    const j = await res.json();
    if (j.error) alert(j.error);
    else {
      alert('Meal logged ✅');
      setName('');
      setCalories('');
      setNotes('');
      setDeduct(false);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding:16 }}>
      <h1>Log Meal</h1>

      <form onSubmit={submit} className="card" style={{ display:'grid', gap:12 }}>
        <div>
          <label className="label">Meal name</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} required />
        </div>

        <div>
          <label className="label">Calories (approx)</label>
          <input className="input" type="number" value={calories} onChange={e=>setCalories(e.target.value)} required />
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input" rows={2} value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>

        <label className="small" style={{ display:'flex', gap:8 }}>
          <input type="checkbox" checked={deduct} onChange={e=>setDeduct(e.target.checked)} />
          Deduct ingredients from pantry (optional)
        </label>

        <button className="btn primary" disabled={loading}>
          {loading ? 'Saving…' : 'Log Meal'}
        </button>
      </form>
    </div>
  );
}
