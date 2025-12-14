'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data: inv } = await supabase.from('items').select('name');
    const invNames = (inv || []).map(i => i.name.toLowerCase());
    setInventory(invNames);

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
    })
    .filter(r => r.missingCount <= 2)
    .sort((a,b) => a.missingCount - b.missingCount);

    setRecipes(scored);
    setLoading(false);
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h1>Recipes</h1>
        <Link href="/recipes/add" className="btn primary">+ Add recipe</Link>
      </div>

      {loading ? (
        <div className="card skeleton" style={{ height:120 }} />
      ) : recipes.length === 0 ? (
        <div className="card small">
          No recipes match your pantry yet. Add 1–2 more staples.
        </div>
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {recipes.map(r => (
            <div key={r.id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontWeight:700 }}>{r.title}</div>
                  <div className="small">
                    {r.cuisine} • {r.servings} servings
                  </div>
                </div>
                <div style={{ fontWeight:700, color: r.missingCount === 0 ? '#16a34a' : '#f59e0b' }}>
                  {r.missingCount === 0 ? 'Ready to cook' : `Missing ${r.missingCount}`}
                </div>
              </div>

              {r.missingCount > 0 && (
                <div className="small" style={{ marginTop:6 }}>
                  Missing: {r.missing.map(m => m.name).join(', ')}
                </div>
              )}

              <div style={{ marginTop:10 }}>
                <Link href={`/recipes/${r.id}`} className="btn">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
