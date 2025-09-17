'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import RecipeCard from '../../components/RecipeCard';

export default function RecipesList() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inventoryNames, setInventoryNames] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => { loadInventoryNames(); }, []);

  useEffect(() => {
    // always try fetch, backend returns all recipes with match_count
    fetchRecipes();
  }, [inventoryNames]);

  async function loadInventoryNames() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setInventoryNames([]); setLoading(false); return; }
      const { data } = await supabase.from('items').select('name');
      setInventoryNames((data||[]).map(i => i.name));
    } catch (err) {
      console.error('loadInventoryNames', err);
      setInventoryNames([]);
    }
  }

  async function fetchRecipes() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      inventoryNames.forEach(n => params.append('inventory[]', n));
      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const j = await res.json();
      setRecipes(Array.isArray(j) ? j : []);
    } catch (err) {
      console.error('fetchRecipes', err);
      setError('Could not load recipes');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  async function cookNow(recipe) {
    const ingredientsList = recipe.ingredients.map(i => `- ${i.qty}${i.unit||''} ${i.name}`).join('\n');
    if (!confirm(`Cook "${recipe.title}"?\nThis will deduct:\n\n${ingredientsList}`)) return;

    const res = await fetch('/api/recipes/cook', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ recipeId: recipe.id }) });
    const data = await res.json();
    if (data.error) return alert('Error: ' + data.error);

    const logs = [];
    for (const ing of data.ingredients) {
      const r = await fetch('/api/inventory/deduct', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(ing) });
      const j = await r.json();
      if (j.error) logs.push(`❌ ${ing.name}: ${j.error}`);
      else logs.push(`✅ ${ing.name}: ${j.message}`);
    }
    alert(`Cooked ${recipe.title}!\n\n${logs.join('\n')}`);
    // refresh pantry info
    loadInventoryNames();
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1>Recipes</h1>
        <div>
          <a className="btn" href="/recipes/all">View All</a>
          <a className="btn" style={{ marginLeft: 8 }} href="/recipes/new">Add Recipe</a>
        </div>
      </div>

      {loading && <div className="small">Loading…</div>}
      {error && <div className="small" style={{ color:'red' }}>{error}</div>}

      {!loading && recipes.length === 0 && <div className="small">No recipes found. Add pantry items or view all recipes.</div>}

      <div className="grid">
        {recipes.map(r => <RecipeCard key={r.id} recipe={r} onCook={cookNow} />)}
      </div>
    </div>
  );
}
