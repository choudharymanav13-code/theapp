'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesList() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryNames, setInventoryNames] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadInventoryNames();
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [inventoryNames, user]);

  async function loadInventoryNames() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUser(null);
      setLoading(false);
      return;
    }
    setUser(user);
    const { data } = await supabase.from('items').select('name');
    setInventoryNames((data || []).map(i => i.name));
  }

  async function fetchRecipes() {
    if (inventoryNames.length === 0) {
      setRecipes([]);
      setLoading(false);
      return;
    }

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

    let errors = [];
    for (const ing of data.ingredients) {
      const r = await fetch('/api/inventory/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ing)
      });
      const result = await r.json();
      if (result.error) {
        console.warn('Deduct error', result.error);
        errors.push(`${ing.name}: ${result.error}`);
      }
    }

    if (errors.length > 0) {
      alert(`Cooked ${recipe.title}, but some ingredients had issues:\n${errors.join('\n')}`);
    } else {
      alert(`Cooked ${recipe.title}! Inventory updated.`);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Recipes</h1>
      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div className="small">Loading…</div>
        ) : recipes.length === 0 ? (
          <div className="small">No recipes found. Add items to your pantry first.</div>
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
    </div>
  );
}
