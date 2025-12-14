'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cuisine, setCuisine] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data: items } = await supabase
      .from('items')
      .select('name');

    const invNames = (items || []).map(i => i.name);
    setInventory(invNames);

    const params = new URLSearchParams();
    invNames.forEach(n => params.append('inventory[]', n));

    const res = await fetch(`/api/recipes?${params.toString()}`);
    const data = await res.json();
    setRecipes(data || []);

    setLoading(false);
  }

  const cuisines = ['All', ...new Set(recipes.map(r => r.cuisine))];

  const filtered = recipes.filter(r => {
    if (cuisine !== 'All' && r.cuisine !== cuisine) return false;
    if (onlyAvailable && r.missing.length > 2) return false;
    return true;
  });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Recipes</h1>
        <Link href="/recipes/add" className="btn primary">+ Add Recipe</Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <select className="input" value={cuisine} onChange={e => setCuisine(e.target.value)}>
          {cuisines.map(c => <option key={c}>{c}</option>)}
        </select>

        <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={e => setOnlyAvailable(e.target.checked)}
          />
          ≤ 2 missing ingredients
        </label>
      </div>

      {/* List */}
      {loading ? (
        <div className="small" style={{ marginTop: 20 }}>Loading recipes…</div>
      ) : filtered.length === 0 ? (
        <div className="card small" style={{ marginTop: 20 }}>
          No recipes match your pantry right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {filtered.map(r => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}`}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div className="small">
                    {r.cuisine} • Serves {r.servings}
                  </div>
                  <div className="small">
                    Missing: {r.missing.length === 0 ? 'None 🎉' : r.missing.join(', ')}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>
                    {r.match_count}/{r.required_count}
                  </div>
                  <div className="small">ingredients</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
