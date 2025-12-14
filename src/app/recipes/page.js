'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cuisine, setCuisine] = useState('All');
  const [availability, setAvailability] = useState('All');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const invRes = await supabase.from('items').select('name');
    const invNames = (invRes.data || []).map(i => i.name.toLowerCase());

    setInventory(invNames);

    const res = await fetch('/api/recipes');
    const allRecipes = await res.json();

    const enriched = allRecipes.map(r => {
      const missing = r.ingredients.filter(
        i => !invNames.some(n => n.includes(i.name.toLowerCase()))
      ).length;

      return {
        ...r,
        missingCount: missing,
      };
    });

    setRecipes(enriched);
    setLoading(false);
  }

  const filtered = recipes.filter(r => {
    if (cuisine !== 'All' && r.cuisine !== cuisine) return false;
    if (availability === '<=2' && r.missingCount > 2) return false;
    return true;
  });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1>Recipes</h1>
        <Link href="/recipes/add" className="btn primary">Add Recipe</Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ display:'flex', gap:12, marginTop:12 }}>
        <select className="input" value={cuisine} onChange={e => setCuisine(e.target.value)}>
          <option value="All">All cuisines</option>
          <option value="Indian">Indian</option>
          <option value="Global">Global</option>
        </select>

        <select className="input" value={availability} onChange={e => setAvailability(e.target.value)}>
          <option value="All">All recipes</option>
          <option value="<=2">Missing ≤ 2 items</option>
        </select>
      </div>

      {loading && <div className="small" style={{ marginTop:12 }}>Loading recipes…</div>}

      {!loading && filtered.length === 0 && (
        <div className="card small" style={{ marginTop:12 }}>
          No recipes match your filters.
        </div>
      )}

      <div style={{ display:'grid', gap:12, marginTop:12 }}>
        {filtered.map(r => (
          <div key={r.id} className="card">
            <div style={{ fontWeight:700 }}>{r.title}</div>
            <div className="small">
              {r.cuisine} • Serves {r.servings} • Missing {r.missingCount}
            </div>

            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <Link href={`/recipes/${r.id}`} className="btn">View</Link>
              <Link href={`/recipes/${r.id}`} className="btn">Cook Now</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
