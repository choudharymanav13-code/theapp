// src/app/add-item/page.js
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';

// ---------- Helpers: AI expiry (same logic as Phase 1) ----------
function daysFromNow(d) {
  const dt = new Date(); dt.setDate(dt.getDate() + d);
  const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), da = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}
function shelfLifeDaysFor(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  const map = [
    [/paneer|cottage\s*cheese/, 7],
    [/curd|yoghurt|yogurt|dahi/, 7],
    [/milk|amul.*milk|mother.*milk/, 5],
    [/cheese/, 14],
    [/bread|bun|loaf/, 5],
    [/egg(s)?\b/, 21],
    [/chicken|fish|mutton|meat/, 2],
    [/cooked|leftover/, 3],
    [/spinach|palak|greens|cilantro|coriander|mint/, 3],
    [/tomato|onion|potato/, 14],
    [/banana|apple|fruit/, 5],
    [/rice|basmati|brown\s*rice/, 365],
    [/atta|flour|maida|rava|suji/, 180],
    [/dal|lentil|toor|moong|chana|urad/, 365],
    [/sugar|salt/, 365],
    [/oil|ghee/, 365],
    [/spice|masala|turmeric|chilli|cumin|garam/, 540],
    [/biscuits|cookies|chips|snack/, 120],
    [/butter|margarine/, 60],
  ];
  for (const [re, days] of map) if (re.test(n)) return days;
  if (/dairy|milk|curd|paneer/.test(n)) return 7;
  if (/vegetable|veg|leafy|greens/.test(n)) return 4;
  if (/grain|cereal|pulse|legume/.test(n)) return 300;
  if (/frozen/.test(n)) return 180;
  return 30;
}

// ---------- Small debounce hook ----------
function useDebouncedValue(val, ms) {
  const [v, setV] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setV(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return v;
}

export default function AddItem() {
  // Form fields
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [cal, setCal] = useState('');   // kcal / 100g or per unit
  const [protein, setProtein] = useState(''); // g / 100g
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [exp, setExp] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');

  // Search state
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 350);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(null);

  // Fetch suggestions when dq changes
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      const term = dq.trim();
      if (!term || term.length < 2) { setResults([]); return; }
      setLoading(true);
      try {
        const r = await fetch(`/api/food-search?q=${encodeURIComponent(term)}`);
        const j = await r.json();
        if (aborted) return;
        setResults(Array.isArray(j?.products) ? j.products : []);
      } catch (e) {
        if (!aborted) setResults([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    run();
    return () => { aborted = true; };
  }, [dq]);

  const autoFillExpiry = () => {
    const days = shelfLifeDaysFor(name || picked?.name);
    if (days) setExp(daysFromNow(days));
    else alert('Could not infer expiry; please enter manually.');
  };

  const pickResult = (p) => {
    setPicked(p);
    if (p?.name) setName(p.name);
    setBrand(p?.brand || '');
    setBarcode(p?.code || '');
    if (p?.kcal_100g != null) setCal(String(p.kcal_100g));
    if (p?.protein_100g != null) setProtein(String(+p.protein_100g.toFixed(1)));
    if (p?.carbs_100g != null) setCarbs(String(+p.carbs_100g.toFixed(1)));
    if (p?.fat_100g != null) setFat(String(+p.fat_100g.toFixed(1)));
  };

  const save = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('You must be signed in.');
    if (!name || !qty || !cal || !exp) return alert('All required fields must be filled.');

    const payload = {
      user_id: user.id,
      name,
      quantity: Number(qty),
      unit,
      calories_per_100g: Number(cal),
      expiry_date: exp,
      // new in Phase 2 (nullable)
      protein_100g: protein !== '' ? Number(protein) : null,
      carbs_100g:   carbs   !== '' ? Number(carbs)   : null,
      fat_100g:     fat     !== '' ? Number(fat)     : null,
      brand: brand || null,
      barcode: barcode || null,
    };

    const { error } = await supabase.from('items').insert(payload);
    if (error) alert(error.message);
    else window.location.href = '/inventory';
  };

  return (
    <>
      <div className="header"><h1>Add Item</h1></div>
      <div className="content">
        {/* Search & autofill card */}
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <div className="label">Search food (auto‑fill calories & macros)</div>
          <input
            className="input"
            placeholder="Try: paneer, dal, dosa, oats…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {loading && <div className="small">Searching…</div>}
          {!!results.length && (
            <div className="list" style={{ marginTop: 4 }}>
              {results.map((r, i) => (
                <div
                  key={(r.code || '') + i}
                  className="list-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => pickResult(r)}
                >
                  <div>
                    <div className="item-title">{r.name || 'Unnamed'}</div>
                    <div className="item-sub">
                      {(r.brand && `${r.brand} • `) || ''}
                      {(r.kcal_100g != null ? `${r.kcal_100g} kcal/100g` : '— kcal')}
                      {` • P ${r.protein_100g ?? '—'}g C ${r.carbs_100g ?? '—'}g F ${r.fat_100g ?? '—'}g`}
                    </div>
                  </div>
                  <button className="btn">Use</button>
                </div>
              ))}
            </div>
          )}
          {!loading && dq && !results.length && (
            <div className="small">No results. You can enter values manually.</div>
          )}
        </div>

        <div className="space"></div>

        {/* Main form */}
        <form className="card" style={{ display: 'grid', gap: 12 }} onSubmit={save}>
          <label className="label">Item name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Amul Paneer" required/>

          <div className="row">
            <div style={{ flex: 2 }}>
              <label className="label">Quantity</label>
              <input className="input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g., 200" required/>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Unit</label>
              <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="count">count</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Calories per 100g/unit (required)</label>
              <input className="input" type="number" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="e.g., 265" required/>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Expiry date (required)</label>
              <div className="row" style={{ gap: 8 }}>
                <input className="input" type="date" value={exp} onChange={(e) => setExp(e.target.value)} required/>
                <button type="button" className="inline-btn" onClick={autoFillExpiry}>Autofill (AI)</button>
              </div>
              <div className="small">Estimated from typical shelf life (you can adjust).</div>
            </div>
          </div>

          {/* New macros section */}
          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Protein / 100g (g)</label>
              <input className="input" type="number" step="any" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="e.g., 18"/>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Carbs / 100g (g)</label>
              <input className="input" type="number" step="any" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="e.g., 4"/>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Fat / 100g (g)</label>
              <input className="input" type="number" step="any" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="e.g., 22"/>
            </div>
          </div>

          {/* (optional) brand/barcode (hidden inputs but kept editable if needed) */}
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Brand (optional)</label>
              <input className="input" value={brand} onChange={(e)=>setBrand(e.target.value)} placeholder="e.g., Amul"/>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Barcode (optional)</label>
              <input className="input" value={barcode} onChange={(e)=>setBarcode(e.target.value)} placeholder="(auto if chosen)"/>
            </div>
          </div>

          <button className="btn primary" type="submit">Save item</button>
        </form>

        <div className="space"></div>

        {/* OCR paste area remains for Phase 3 */}
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          <div className="label">Paste receipt text (Phase 3 will parse this)</div>
          <textarea className="input" rows={3} placeholder="e.g., Amul Paneer 200g, Mother Dairy Curd 500g..."></textarea>
          <button className="btn" disabled>Parse & suggest (Coming in Phase 3)</button>
        </div>
      </div>
    </>
  );
}
