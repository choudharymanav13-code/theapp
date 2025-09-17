'use client';

import { useEffect, useState } from 'react';
import RecipeCard from '../../../components/RecipeCard';

export default function AllRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      if (!res.ok) throw new Error('API fail');
      const j = await res.json();
      setRecipes(Array.isArray(j) ? j : []);
    } catch (err) {
      console.error('fetchAll', err);
      setRecipes([]);
    } finally { setLoading(false); }
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
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h1>All Recipes</h1>
        <a className="btn" href="/recipes">My Recipes</a>
      </div>

      {loading && <div className="small">Loading…</div>}
      <div className="grid">
        {recipes.map(r => <RecipeCard key={r.id} recipe={r} onCook={cookNow} />)}
      </div>
    </div>
  );
}
