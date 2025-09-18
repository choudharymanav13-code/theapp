'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesList() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryNames, setInventoryNames] = useState([]);
  const [user, setUser] = useState(null);
  const [cookSummary, setCookSummary] = useState(null); // summary modal

  useEffect(() => {
    loadInventoryNames();
  }, []);

  useEffect(() => {
    if (inventoryNames.length > 0) fetchRecipes();
  }, [inventoryNames]);

  async function loadInventoryNames() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    setUser(user);
    const { data } = await supabase.from('items').select('name');
    setInventoryNames((data || []).map(i => i.name));
  }

  async function fetchRecipes() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      inventoryNames.forEach(n => params.append('inventory[]', n));
      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const j = await res.json();
      setRecipes(j);
    } catch (err) {
      console.error('fetchRecipes error:', err);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  async function cookRecipe(recipe) {
    if (!confirm(`Cook "${recipe.title}"?\nThis will deduct ingredients from your pantry.`)) {
      return;
    }

    try {
      const res = await fetch('/api/recipes/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id, user_id: user.id })
      });
      const data = await res.json();

      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }

      // open modal summary
      setCookSummary({ recipe: recipe.title, results: data.results });
    } catch (err) {
      console.error('cookRecipe error', err);
      alert('Something went wrong while cooking.');
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Recipes</h1>
      <div style={{ marginTop: 12 }}>
        {loading ? <div className="small">Loading…</div> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {recipes.length === 0 && (
              <div className="small">No recipes found with your current pantry.</div>
            )}
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
                    <div className="small">Have ingredients</div>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Link href={`/recipes/${r.id}`} className="btn">View</Link>
                  <button
                    className="btn"
                    style={{ marginLeft: 8 }}
                    onClick={() => cookRecipe(r)}
                  >
                    Cook Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cook Summary Modal */}
      {cookSummary && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Cooked {cookSummary.recipe}</h2>
            <div className="list">
              {cookSummary.results.map((r, i) => (
                <div key={i} className={`list-item ${r.ok ? 'success' : 'fail'}`}>
                  <div className="item-title">{r.name || 'Unknown'}</div>
                  <div className="item-sub">
                    {r.ok
                      ? `✔ Deducted ${r.deducted}${r.unit} • Remaining: ${r.remaining}`
                      : `❌ ${r.error}`}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn primary"
              onClick={() => {
                setCookSummary(null);
                window.location.href = '/recipes';
              }}
              style={{ marginTop: 16 }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
