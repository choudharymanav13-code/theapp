'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesList() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryNames, setInventoryNames] = useState([]);

  // Filters
  const [q, setQ] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [calories, setCalories] = useState('');
  const [suggest, setSuggest] = useState(false);

  useEffect(() => {
    loadInventoryNames();
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [inventoryNames, q, cuisine, calories, suggest]);

  async function loadInventoryNames() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    const { data } = await supabase.from('items').select('name');
    setInventoryNames((data || []).map(i => i.name));
  }

  async function fetchRecipes() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      inventoryNames.forEach(n => params.append('inventory[]', n));
      if (q) params.set('q', q);
      if (cuisine) params.set('cuisine', cuisine);
      if (calories) params.set('calories', calories);
      if (suggest) params.set('suggest', 'true');

      const res = await fetch(`/api/recipes?${params.toString()}`);
      const j = await res.json();
      setRecipes(j);
    } catch (err) {
      console.error('fetchRecipes error:', err);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Recipes</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search recipes..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 2 }}
        />
        <select className="input" value={cuisine} onChange={e => setCuisine(e.target.value)}>
          <option value="">All cuisines</option>
          <option value="indian">Indian</option>
          <option value="italian">Italian</option>
          <option value="mexican">Mexican</option>
          <option value="chinese">Chinese</option>
          <option value="global">Global</option>
        </select>
        <select className="input" value={calories} onChange={e => setCalories(e.target.value)}>
          <option value="">Any kcal</option>
          <option value="200">≤ 200</option>
          <option value="500">≤ 500</option>
          <option value="800">≤ 800</option>
        </select>
        <button
          className={`btn ${suggest ? 'primary' : ''}`}
          onClick={() => setSuggest(!suggest)}
        >
          {suggest ? 'Showing Suggestions' : 'Suggest Recipes'}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div className="small">Loading…</div>
        ) : recipes.length === 0 ? (
          <div className="small">No recipes found. Try adjusting filters or add your own!</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {recipes.map(r => (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.title}</div>
                    <div className="small">
                      {r.cuisine} • Serves {r.servings} • {r.nutrition?.kcal} kcal
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {r.match_count ?? '-'}/{r.required_count ?? r.ingredients.length}
                    </div>
                    <div className="small">
                      {r.missing_count === 0
                        ? 'Complete'
                        : `${r.missing_count} missing`}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Link href={`/recipes/${r.id}`} className="btn">View</Link>
                  <button
                    className="btn"
                    style={{ marginLeft: 8 }}
                    onClick={() => (window.location.href = `/recipes/${r.id}`)}
                  >
                    Cook Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Recipe Button */}
      <div style={{ marginTop: 16 }}>
        <Link href="/recipes/add" className="btn primary">+ Add Recipe</Link>
      </div>
    </div>
  );
}
