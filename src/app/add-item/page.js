// src/app/add-item/page.js
'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BrowserMultiFormatReader } from '@zxing/library';

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

/* ---------------- Small debounce hook ---------------- */
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [widen, setWiden] = useState(false);

  /* -------- Barcode scanner state -------- */
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const codeReader = useRef(null);

  /* -------- Actions -------- */
  const autoFillExpiry = () => {
    const days = shelfLifeDaysFor(name);
    if (days) setExp(daysFromNow(days));
    else alert('Could not infer expiry; please enter manually.');
  };

  const pickResult = (p) => {
    if (p?.name) setName(p.name);
    setBrand(p?.brand || '');
    setBarcode(p?.code || '');

    if (p?.kcal_100g != null) setCal(String(p.kcal_100g));
    if (p?.protein_100g != null) setProtein(String(+Number(p.protein_100g).toFixed(1)));
    if (p?.carbs_100g != null) setCarbs(String(+Number(p.carbs_100g).toFixed(1)));
    if (p?.fat_100g != null) setFat(String(+Number(p.fat_100g).toFixed(1)));
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

  /* -------- Backend call -------- */
  async function fetchPage(p, append = false, mode = "search") {
    const params = new URLSearchParams();
    if (mode === "search") {
      if (!dq || dq.trim().length < 2) { setResults([]); setHasMore(false); return; }
      params.set("q", dq);
    } else if (mode === "barcode" && barcode) {
      params.set("barcode", barcode);
    }
    params.set("page", p);
    params.set("pageSize", 30);
    params.set("countries", widen ? "india|united-kingdom|united-states" : "india");

    setLoading(true);
    try {
      const r = await fetch(`/api/food-search?${params.toString()}`);
      const j = await r.json();
      const arr = Array.isArray(j?.products) ? j.products : [];
      setResults(prev => (append ? [...prev, ...arr] : arr));
      setHasMore(arr.length >= 30);
    } catch {
      if (!append) setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  /* -------- Trigger search -------- */
  useEffect(() => {
    setPage(1);
    if (dq && dq.trim().length >= 2) fetchPage(1, false, "search");
    else { setResults([]); setHasMore(false); }
  }, [dq, widen]);

  /* -------- Barcode scanner -------- */
  const startScanner = async () => {
    setScanning(true);
    if (!codeReader.current) {
      codeReader.current = new BrowserMultiFormatReader();
    }
    try {
      const devices = await codeReader.current.listVideoInputDevices();
      const deviceId = devices[0]?.deviceId;
      if (!deviceId) {
        alert("No camera found");
        setScanning(false);
        return;
      }
      codeReader.current.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result) {
          setBarcode(result.text);
          setScanning(false);
          codeReader.current.reset();
          fetchPage(1, false, "barcode");
        }
      });
    } catch (err) {
      console.error(err);
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (codeReader.current) codeReader.current.reset();
    setScanning(false);
  };

  return (
    <>
      <div className="header"><h1>Add Item</h1></div>

      <div className="content">
        {/* ---------- Search & Autofill card ---------- */}
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <div className="label">Search food (autofill calories & macros)</div>

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              className="input"
              placeholder="Try: paneer, dahi, maggi, kurkure…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={widen}
                onChange={(e) => setWiden(e.target.checked)}
              />
              Widen results
            </label>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              placeholder="Enter barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <button className="btn" type="button" onClick={() => fetchPage(1, false, "barcode")}>
              Lookup Barcode
            </button>
            <button className="btn" type="button" onClick={startScanner}>
              {scanning ? "Scanning..." : "Scan Barcode"}
            </button>
          </div>

          {scanning && (
            <div style={{ marginTop: 8 }}>
              <video ref={videoRef} style={{ width: "100%" }} />
              <button className="btn" type="button" onClick={stopScanner}>Stop</button>
            </div>
          )}

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
                      {(r.brand ? `${r.brand} • ` : '')}
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
            <div className="small">
              No results. Tip: toggle <b>Widen results</b> or try synonyms (dahi/curd, bhindi/okra).
            </div>
          )}

          {!loading && hasMore && (
            <button
              className="btn"
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetchPage(next, true, "search");
              }}
            >
              Load more
            </button>
          )}
        </div>

        <div className="space"></div>

        {/* ---------- Main form ---------- */}
        <form className="card" style={{ display: 'grid', gap: 12 }} onSubmit={save}>
          <label className="label">Item name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Amul Paneer" required/>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label className="label">Quantity</label>
              <input className="input" type="number" value={qty}
                     onChange={(e) => setQty(e.target.value)} placeholder="e.g., 200" required/>
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
              <input className="input" type="number" value={cal}
                     onChange={(e) => setCal(e.target.value)} placeholder="e.g., 265" required/>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Expiry date (required)</label>
              <div className="row" style={{ gap: 8 }}>
                <input className="input" type="date" value={exp} onChange={(e) => setExp(e.target.value)} required/>
                <button type="button" className="inline-btn" onClick={autoFillExpiry}>Autofill (AI)</button>
              </div>
            </div>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Protein / 100g (g)</label>
              <input className="input" type="number" step="any" value={protein}
                     onChange={(e) => setProtein(e.target.value)} placeholder="e.g., 18"/>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Carbs / 100g (g)</label>
              <input className="input" type="number" step="any" value={carbs}
                     onChange={(e) => setCarbs(e.target.value)} placeholder="e.g., 4"/>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Fat / 100g (g)</label>
              <input className="input" type="number" step="any" value={fat}
                     onChange={(e) => setFat(e.target.value)} placeholder="e.g., 22"/>
            </div>
          </div>
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
      </div>
    </>
  );
}
