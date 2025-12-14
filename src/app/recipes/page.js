'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [cuisine, setCuisine] = useState('All');
  const [availability, setAvailability] = useState('all'); // all | ready | missing
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [recipes, cuisine, availability]);

  async function load() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Load inventory
    const { data: inv } = await supabase
      .from('items')
      .select('name');

    const invNames = (inv || []).map(i => i.name.toLowerCase());
    setInventory(invNames);

    // Load recipes
    const params = new URLSearchParams();
    invNames.forEach(n => params.append('inventory[]', n));

    const res = await fetch(`/api/recipes?${params.toString()}`);
    const data = await res.json();

    const scored = (data || []).map(r => {
      const missing = r.ingredients.filter(
        i => !invNames.some(n => n.includes(i.name.toLowerCase()))
      );
      return {
        ...r,
        missing,
        missingCount: missing.length
      };
    });

    setRecipes(scored);
    setLoading(false);
  }

  function applyFilters() {
    let list = [...recipes];

    if (cuisine !== 'All') {
      list = list.filter(r => r.cuisine === cuisine);
    }

    if (availability === 'ready') {
      list = list.filter(r => r.missingCount === 0);
    }

    if (availability === 'missing') {
      list = list.filter(r => r.missingCount > 0 && r.missingCount <= 2);
    }

    setFiltered(list);
  }

  const cuisines = ['All', ...new Set(recipes.map(r => r.cuisine))];

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h1>Recipes</h1>
        <Link href="/recipes/add" className="btn primary">+ Add recipe</Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ display:'flex', gap:8, marginBottom:12 }}>
        <select className="input" value={cuisine} onChange={e => setCuisine(e.target.value)}>
          {cuisines.map(c => <option key={c}>{c}</option>)}
        </select>

        <select className="input" value={availability} onChange={e => setAvailability(e.target.value)}>
          <option value="all">All</option>
          <option value="ready">Ready to cook</option>
          <option value="missing">≤ 2 missing</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card small">Loading recipes…</div>
      ) : filtered.length === 0 ? (
        <div className="card small">
          No recipes match your current filters.
        </div>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {filtered.map(r => (
            <div key={r.id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700 }}>{r.title}</div>
                  <div className="small">{r.cuisine} • Serves {r.servings}</div>
                </div>
                <div style={{
                  fontWeight:700,
                  color: r.missingCount === 0 ? '#16a34a' : '#f59e0b'
                }}>
                  {r.missingCount === 0 ? 'Ready' : `Missing ${r.missingCount}`}
                </div>
              </div>

              {r.missingCount > 0 && (
                <div className="small" style={{ marginTop:6 }}>
                  Missing: {r.missing.map(m => m.name).join(', ')}
                </div>
              )}

              <div style={{ marginTop:10, display:'flex', gap:8 }}>
                <Link href={`/recipes/${r.id}`} className="btn">
                  View
                </Link>

                {r.missingCount === 0 && (
                  <Link href={`/recipes/${r.id}?cook=1`} className="btn primary">
                    Cook now
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
