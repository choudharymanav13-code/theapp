// src/app/add-item/page.js
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// ---------- Helpers: AI expiry ----------
function daysFromNow(d) {
  const dt = new Date(); dt.setDate(dt.getDate() + d);
  const y = dt.getFullYear(), m = String(dt.getMonth()+1).padStart(2, '0'), da = String(dt.getDate()).padStart(2, '0');
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
    [/spinach|palak|greens|cilantro|coriander|mint|leafy/, 3],
    [/tomato/, 7],
    [/onion|potato/, 14],
    [/banana|apple|mango|fruit/, 5],
    [/okra|bhindi/, 5],
    [/rice|basmati|brown\s*rice/, 365],
    [/atta|flour|maida|rava|suji/, 180],
    [/dal|lentil|toor|moong|chana|urad|masoor|pulse/, 365],
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
function useDebounced(val, ms) {
  const [v, setV] = useState(val);
  useEffect(() => { const t = setTimeout(() => setV(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return v;
}

export default function AddItem() {
  // Form
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [cal, setCal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [exp, setExp] = useState('');
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');

  // Search
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');
  const dq = useDebounced(q, 300);
  const [results, setResults] = useState([]);
  const [cats, setCats] = useState(['All']);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(null);

  // Fetch when query/category changes
  useEffect(() => {
    let aborted = false;
    const run = async () => {
      setLoading(true);
      try {
        const url = `/api/food-search?q=${encodeURIComponent(dq)}&category=${encodeURIComponent(category)}&size=20`;
        const r = await fetch(url, { cache: 'no-store' });
        const j = await r.json();
        if (aborted) return;
        setResults(Array.isArray(j?.products) ? j.products : []);
        if (Array.isArray(j?.categories) && j.categories.length) setCats(j.categories);
      } catch {
        if (!aborted) setResults([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    run();
    return () => { aborted = true; };
  }, [dq, category]);

  const autoFillExpiry = () => {
    const days = shelfLifeDaysFor(name || picked?.name);
    if (days) setExp(daysFromNow(days));
    else alert('Could not infer expiry; please enter manually.');
  };

  const pickResult = (p) => {
    setPicked(p);
    if (p?.name) setName(p.name);
    setBrand(p?.brand || '');
    setBarcode(p?.code?.startsWith?.('fallback:') ? '' : (p?.code || ''));
    if (p?.kcal_100g != null) setCal(String(p.kcal_100g));
    if (p?.protein_100g != null) setProtein(String(+Number(p.protein_100g).toFixed(1)));
    if (p?.carbs_100g != null) setCarbs(String(+Number(p.carbs_100g).toFixed(1)));
    if (p?.fat_100g != null) setFat(String(+Number(p.fat_100g).toFixed(1)));
  };

  const save = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('You must be signed in.');
    if (!name || !qty || !cal || !exp) return alert('All required fields must be filled.');

    const payload = {
      user_id: user.id,
      name, quantity: Number(qty), unit,
      calories_per_100g: Number(cal),
      expiry_date: exp,
      protein_100g: protein !== '' ? Number(protein) : null,
      carbs_100g: carbs !== '' ? Number(carbs) : null,
      fat_100g: fat !== '' ? Number(fat) : null,
      brand: brand || null,
      barcode: barcode || null,
    };

    const { error } = await supabase.from('items').insert(payload);
    if (error) alert(error.message);
    else window.location.href = '/inventory';
  };

  const SourcePill = ({ source }) => {
    const isOFF = source === 'off';
    const label = isOFF ? 'OFF' : 'Staple';
    const bg = isOFF ? '#065f46' : '#1f2937';
    const br = isOFF ? '#10b981' : '#334155';
    return (
      <span style={{
        marginLeft: 6, fontSize: 12, padding: '2px 8px', borderRadius: 999,
        background: bg, border: `1px solid ${br}`, color: '#e5e7eb'
      }}>{label}</span>
    );
  };

  return (
    <>
      <div className="header"><h1>Add Item</h1></div>
      <div className="content">

        {/* Category Tabs */}
        <div className="card" style={{padding: 8}}>
          <div className="row" style={{flexWrap:'wrap', gap:8}}>
            {cats.map(c => (
              <button
                key={c}
                type="button"
                className="inline-btn"
                onClick={() => setCategory(c)}
                style={{
                  background: category === c ? '#22c55e' : '#0b1220',
                  color: category === c ? '#052e16' : '#d4d4d8',
                  borderColor: category === c ? '#16a34a' : '#334155'
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space"></div>

        {/* Search & results */}
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <div className="label">Search food (autofill calories & macros)</div>
          <input
            className="input"
            placeholder="Try: paneer, maggi, amul, oats, mustard oil…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {loading && <div className="small">Searching…</div>}
          {!!results.length && (
            <div className="list" style={{ marginTop: 4 }}>
              {results.map((r, i) => (
                <div
                  key={`${r.code || r.name || 'x'}-${i}`}
                  className="list-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => pickResult(r)}
                >
                  <div>
                    <div className="item-title">
                      {r.name || 'Unnamed'}
                      {r.brand ? <span className="badge" style={{ marginLeft: 6 }}>{r.brand}</span> : null}
                      <SourcePill source={r.source} />
                    </div>
                    <div className="item-sub">
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
            <div className="small">No results. Try a simpler term, or pick a category tab above.</div>
          )}
        </div>

        <div className="space"></div>

        {/* Main form */}
        <form className="card" style={{ display: 'grid', gap: 12 }} onSubmit={save}>
          <label className="label">Item name</label>
          <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Mustard Oil / Paneer / Toor Dal" required/>

          <div className="row">
            <div style={{flex:2}}>
              <label className="label">Quantity</label>
              <input className="input" type="number" value={qty} onChange={(e)=>setQty(e.target.value)} placeholder="e.g., 200" required/>
            </div>
            <div style={{flex:1}}>
              <label className="label">Unit</label>
              <select className="input" value={unit} onChange={(e)=>setUnit(e.target.value)}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="count">count</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div style={{flex:1}}>
              <label className="label">Calories per 100g/unit (required)</label>
              <input className="input" type="number" value={cal} onChange={(e)=>setCal(e.target.value)} placeholder="e.g., 265" required/>
            </div>
            <div style={{flex:1}}>
              <label className="label">Expiry date <span className="note">(required)</span></label>
              <div className="row" style={{gap:8}}>
                <input className="input" type="date" value={exp} onChange={(e)=>setExp(e.target.value)} required/>
                <button type="button" className="inline-btn" onClick={autoFillExpiry}>Autofill (AI)</button>
              </div>
              <div className="small">Estimated from typical shelf life (you can adjust).</div>
            </div>
          </div>

          {/* Macros */}
          <div className="row">
            <div style={{flex:1}}>
              <label className="label">Protein / 100g (g)</label>
              <input className="input" type="number" step="any" value={protein} onChange={(e)=>setProtein(e.target.value)} placeholder="e.g., 18"/>
            </div>
            <div style={{flex:1}}>
              <label className="label">Carbs / 100g (g)</label>
              <input className="input" type="number" step="any" value={carbs} onChange={(e)=>setCarbs(e.target.value)} placeholder="e.g., 60"/>
            </div>
            <div style={{flex:1}}>
              <label className="label">Fat / 100g (g)</label>
              <input className="input" type="number" step="any" value={fat} onChange={(e)=>setFat(e.target.value)} placeholder="e.g., 20"/>
            </div>
          </div>

          {/* Optional brand/barcode */}
          <div className="row" style={{gap:8}}>
            <div style={{flex:1}}>
              <label className="label">Brand (optional)</label>
              <input className="input" value={brand} onChange={(e)=>setBrand(e.target.value)} placeholder="e.g., Amul"/>
            </div>
            <div style={{flex:1}}>
              <label className="label">Barcode (optional)</label>
              <input className="input" value={barcode} onChange={(e)=>setBarcode(e.target.value)} placeholder="auto-filled if OFF"/>
            </div>
          </div>

          <button className="btn primary" type="submit">Save item</button>
        </form>

        <div className="space"></div>

        {/* OCR paste area (Phase 3) */}
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          <div className="label">Paste receipt text (Phase 3 will parse this)</div>
          <textarea className="input" rows={3} placeholder="e.g., Amul Paneer 200g, Mustard Oil 1L, Toor Dal 1kg..."></textarea>
          <button className="btn" disabled>Parse & suggest (Coming in Phase 3)</button>
        </div>

      </div>
    </>
  );
}
