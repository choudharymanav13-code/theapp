// src/app/add-item/page.js
'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BrowserMultiFormatReader } from '@zxing/library';
import { parseReceiptText } from '../../utils/parseReceipt';

/* ---------------- AI Expiry Helpers ---------------- */
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

/* ---------------- Debounce Hook ---------------- */
function useDebouncedValue(val, ms) {
  const [v, setV] = useState(val);
  useEffect(() => { const t = setTimeout(() => setV(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return v;
}

export default function AddItem() {
  /* -------- Inventory form state -------- */
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

  /* -------- Search state -------- */
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 350);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [widen, setWiden] = useState(false);

  /* -------- Scanner state -------- */
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const codeReaderRef = useRef(null);

  /* -------- Receipt parser state -------- */
  const [receiptText, setReceiptText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [parsing, setParsing] = useState(false);

  /* -------- Effects: search -------- */
  useEffect(() => {
    if (dq && dq.trim().length >= 2) {
      fetchFoods(dq);
    } else {
      setResults([]); // show nothing when empty
    }
  }, [dq, widen]);

  /* -------- Backend call to unified food-search -------- */
  async function fetchFoods(qStr = '', barcodeParam = '') {
    const params = new URLSearchParams();
    if (barcodeParam) params.set('barcode', barcodeParam);
    else if (qStr) params.set('q', qStr);
    params.set('countries', widen ? 'india|united-kingdom|united-states' : 'india');
    setLoading(true);
    try {
      const res = await fetch(`/api/food-search?${params.toString()}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchFoods error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  /* -------- Barcode scanner -------- */
  const openScanner = async () => {
    setScanning(true);
    codeReaderRef.current ||= new BrowserMultiFormatReader();
    try {
      const overlay = document.createElement('div');
      overlay.id = 'barcode-overlay';
      Object.assign(overlay.style, {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 9999
      });

      const container = document.createElement('div');
      Object.assign(container.style, { width: '90%', maxWidth: '420px', position: 'relative' });

      const video = document.createElement('video');
      Object.assign(video.style, { width: '100%', borderRadius: '8px', background: '#000' });
      container.appendChild(video);

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Cancel';
      Object.assign(closeBtn.style, { position: 'absolute', top: 8, right: 8, padding: '6px 10px',
        borderRadius: 6, background: '#fff', border: 'none', cursor: 'pointer' });
      closeBtn.onclick = () => cleanup();
      container.appendChild(closeBtn);

      overlay.appendChild(container);
      document.body.appendChild(overlay);
      scannerRef.current = overlay;

      const result = await codeReaderRef.current.decodeOnceFromVideoDevice(undefined, video);
      const scannedCode = result.getText();
      cleanup();
      await fetchFoods('', scannedCode);
    } catch (err) {
      console.error('Scanner error', err);
      cleanup();
    }
  };
  const cleanup = () => {
    try { if (codeReaderRef.current) codeReaderRef.current.reset(); } catch {}
    if (scannerRef.current) { scannerRef.current.remove(); scannerRef.current = null; }
    setScanning(false);
  };

  /* -------- Actions -------- */
  const pickResult = (p) => {
    if (p?.name) setName(p.name);
    setBrand(p?.brand || '');
    setBarcode(p?.code || '');
    if (p?.kcal_100g != null) setCal(String(p.kcal_100g));
    if (p?.protein_100g != null) setProtein(String(+Number(p.protein_100g).toFixed(1)));
    if (p?.carbs_100g != null) setCarbs(String(+Number(p.carbs_100g).toFixed(1)));
    if (p?.fat_100g != null) setFat(String(+Number(p.fat_100g).toFixed(1)));
    const days = shelfLifeDaysFor(p?.name || name);
    if (days) setExp(daysFromNow(days));
  };

  const autoFillExpiry = () => {
    const days = shelfLifeDaysFor(name);
    if (days) setExp(daysFromNow(days));
    else alert('Could not infer expiry; please enter manually.');
  };

  async function save(e) {
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
      protein_100g: protein !== '' ? Number(protein) : null,
      carbs_100g: carbs !== '' ? Number(carbs) : null,
      fat_100g: fat !== '' ? Number(fat) : null,
      brand: brand || null,
      barcode: barcode || null,
    };
    const { error } = await supabase.from('items').insert(payload);
    if (error) alert(error.message);
    else window.location.href = '/inventory';
  }

  /* -------- Receipt parse + bulk save -------- */
  async function handleParse() {
    setParsing(true);
    const items = parseReceiptText(receiptText);

    const enriched = [];
    for (const item of items) {
      try {
        const res = await fetch(`/api/food-search?q=${encodeURIComponent(item.name)}`);
        const data = await res.json();
        const best = Array.isArray(data) && data.length > 0 ? data[0] : null;

        enriched.push({
          ...item,
          brand: best?.brand || '',
          barcode: best?.code || '',
          kcal: best?.kcal_100g || '',
          protein: best?.protein_100g || '',
          carbs: best?.carbs_100g || '',
          fat: best?.fat_100g || '',
          expiry: daysFromNow(shelfLifeDaysFor(item.name))
        });
      } catch {
        enriched.push({ ...item, kcal: '', protein: '', carbs: '', fat: '', expiry: '' });
      }
    }
    setParsedItems(enriched);
    setParsing(false);
  }

  async function saveAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('You must be signed in.');
    const payload = parsedItems.map(p => ({
      user_id: user.id,
      name: p.name,
      quantity: p.qty,
      unit: p.unit,
      calories_per_100g: Number(p.kcal) || 0,
      expiry_date: p.expiry,
      protein_100g: p.protein !== '' ? Number(p.protein) : null,
      carbs_100g: p.carbs !== '' ? Number(p.carbs) : null,
      fat_100g: p.fat !== '' ? Number(p.fat) : null,
      brand: p.brand || null,
      barcode: p.barcode || null,
    }));
    const { error } = await supabase.from('items').insert(payload);
    if (error) alert(error.message);
    else {
      alert('Items saved!');
      setParsedItems([]);
      setReceiptText('');
    }
  }

  /* -------- Derived: macro summary -------- */
  const macroSummary = () => {
    const kcal100 = Number(cal) || 0;
    const p100 = Number(protein) || 0;
    const c100 = Number(carbs) || 0;
    const f100 = Number(fat) || 0;
    const multiplier = (Number(qty) && Number(qty) > 0) ? (Number(qty) / 100) : null;
    return {
      per100: { kcal: kcal100, p: p100, c: c100, f: f100 },
      total: multiplier ? {
        kcal: +(kcal100 * multiplier).toFixed(0),
        p: +(p100 * multiplier).toFixed(1),
        c: +(c100 * multiplier).toFixed(1),
        f: +(f100 * multiplier).toFixed(1)
      } : null
    };
  };
  const summary = macroSummary();

  /* -------- UI -------- */
  return (
    <>
      <div className="header"><h1>Add Item</h1></div>

      <div className="content">
        {/* Search card */}
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <div className="label">Search food (autofill calories & macros)</div>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Try: paneer, dahi/curd, bhindi/okra, poha, chicken sausage…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={widen}
                  onChange={(e) => setWiden(e.target.checked)}
                />
                Widen results
              </label>
              <button type="button" onClick={openScanner} disabled={scanning} className="inline-btn">
                {scanning ? 'Scanning…' : 'Scan Barcode'}
              </button>
            </div>
          </div>

          {loading && <div className="small">Searching…</div>}
          {!!results.length && (
            <div className="list" style={{ marginTop: 4 }}>
              {results.map((r, i) => (
                <div key={(r.code || '') + i} className="list-item" style={{ cursor: 'pointer' }}>
                  <div onClick={() => pickResult(r)}>
                    <div className="item-title">{r.name || 'Unnamed'}</div>
                    <div className="item-sub">
                      {(r.brand ? `${r.brand} • ` : '')}
                      {(r.kcal_100g != null ? `${r.kcal_100g} kcal/100g` : '— kcal')}
                      {` • P ${r.protein_100g ?? '—'}g C ${r.carbs_100g ?? '—'}g F ${r.fat_100g ?? '—'}g`}
                    </div>
                  </div>
                  <button className="btn" onClick={() => pickResult(r)}>Use</button>
                </div>
              ))}
            </div>
          )}
          {!loading && q && !results.length && (
            <div className="small">No results found. Tip: toggle <b>Widen results</b> or try synonyms (dahi/curd, bhindi/okra).</div>
          )}
        </div>

        <div className="space"></div>

        {/* Manual form */}
        <form className="card" style={{ display: 'grid', gap: 12 }} onSubmit={save}>
          <label className="label">Item name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Amul Paneer" required />
          <div className="small" style={{ marginTop: -6 }}>
            <strong>Macros:</strong> {summary.per100.kcal} kcal /100g • P {summary.per100.p}g C {summary.per100.c}g F {summary.per100.f}g
            {summary.total && ` • For ${qty || 0}${unit}: ${summary.total.kcal} kcal (P ${summary.total.p}g C ${summary.total.c}g F ${summary.total.f}g)`}
          </div>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label className="label">Quantity</label>
              <input className="input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} required />
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
              <label className="label">Calories per 100g/unit</label>
              <input className="input" type="number" value={cal} onChange={(e) => setCal(e.target.value)} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Expiry date</label>
              <div className="row" style={{ gap: 8 }}>
                <input className="input" type="date" value={exp} onChange={(e) => setExp(e.target.value)} required />
                <button type="button" className="inline-btn" onClick={autoFillExpiry}>Autofill (AI)</button>
              </div>
            </div>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Protein / 100g (g)</label>
              <input className="input" type="number" step="any" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Carbs / 100g (g)</label>
              <input className="input" type="number" step="any" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Fat / 100g (g)</label>
              <input className="input" type="number" step="any" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Brand (optional)</label>
              <input className="input" value={brand} onChange={(e)=>setBrand(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Barcode (optional)</label>
              <input className="input" value={barcode} onChange={(e)=>setBarcode(e.target.value)} placeholder="(auto if chosen)" />
            </div>
          </div>
          <button className="btn primary" type="submit">Save item</button>
        </form>

        <div className="space"></div>

        {/* Receipt Parser */}
        <div className="card" style={{ display: 'grid', gap: 8 }}>
          <div className="label">Paste receipt text</div>
          <textarea
            className="input"
            rows={3}
            placeholder="e.g., Amul Paneer 200g\nMother Dairy Curd 500ml\nMaggi 2 pack"
            value={receiptText}
            onChange={(e) => setReceiptText(e.target.value)}
          />
          <button className="btn" onClick={handleParse} disabled={parsing}>
            {parsing ? 'Parsing…' : 'Parse & Suggest'}
          </button>

          {parsedItems.length > 0 && (
            <>
              <div className="list">
                {parsedItems.map((p, i) => (
                  <div key={i} className="list-item">
                    <div>
                      <div className="item-title">{p.name}</div>
                      <div className="item-sub">
                        {p.qty} {p.unit} • {p.kcal || '—'} kcal/100g •
                        P {p.protein || '—'}g C {p.carbs || '—'}g F {p.fat || '—'}g
                        • Exp: {p.expiry || '—'}
                      </div>
                    </div>
                    <button className="btn" onClick={() => setParsedItems(parsedItems.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                ))}
              </div>
              <button className="btn primary" onClick={saveAll}>Save All</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
