'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesList() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inventoryNames, setInventoryNames] = useState([]);

  // load pantry once
  useEffect(() => {
    loadInventoryNames();
  }, []);

  // fetch recipes whenever inventory changes
  useEffect(() => {
    if (inventoryNames.length > 0) {
      fetchRecipes();
    } else {
      setLoading(false); // nothing in pantry, stop spinner
    }
  }, [inventoryNames]);

  async function loadInventoryNames() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from('items').select('name');
      if (error) throw error;
      setInventoryNames((data || []).map(i => i.name));
    } catch (err) {
      console.error('loadInventoryNames error:', err);
      setError('Could not load inventory');
      setLoading(false);
    }
  }

  async function fetchRecipes() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      inventoryNames.forEach(n => params.append('inventory[]', n));
      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (!res.ok) throw new Error(`API failed: ${res.status}`);
      const j = await res.json();
      setRecipes(Array.isArray(j) ? j : []);
    } catch (err) {
      console.error('fetchRecipes error:', err);
      setError('Could not fetch recipes');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  async function cookRecipe(recipe) {
    if (!confirm(`Cook "${recipe.title}"?\nThis will deduct ingredients from your pantry.`)) return;
    try {
      const res = await fetch('/api/recipes/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id })
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }

      // deduct ingredients
      for (const ing of data.ingredients) {
        const r = await fetch('/api/inventory/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ing)
        });
        const result = await r.json();
        if (result.error) {
          console.warn('Deduct error', result.error);
        }
      }

      alert(`Cooked ${recipe.title}! Inventory updated.`);
    } catch (err) {
      console.error('cookRecipe error:', err);
      alert('Something went wrong cooking this recipe');
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Recipes</h1>

      {loading && <div className="small">Loading…</div>}
      {error && <div className="small" style={{ color: 'red' }}>{error}</div>}

      {!loading && !error && recipes.length === 0 && (
        <div className="small">No recipes found. Try adding more pantry items.</div>
      )}

      {!loading && !error && recipes.length > 0 && (
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {recipes.map(r => (
            <div key={r.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div className="small">
                    {r.cuisine} • Serves {r.servings} • {r.nutrition?.kcal ?? '—'} kcal
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
  );
}
