'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function RecipeDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pantry, setPantry] = useState([]);

  useEffect(()=>{ fetchRecipe(); loadPantry(); }, [id]);

  async function loadPantry() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPantry([]); return; }
      const { data } = await supabase.from('items').select('name,quantity,unit');
      setPantry(data || []);
    } catch (err) { setPantry([]); }
  }

  function hasIngredient(ingName) {
    const target = ingName.toLowerCase();
    return pantry.some(p => p.name && (p.name.toLowerCase().includes(target) || target.includes(p.name.toLowerCase())));
  }

  async function fetchRecipe() {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      const all = await res.json();
      const found = all.find(r => String(r.id) === String(id));
      setRecipe(found || null);
    } catch (err) {
      console.error('fetchRecipe', err);
      setRecipe(null);
    } finally { setLoading(false); }
  }

  async function cookRecipe() {
    if (!recipe) return;
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
    router.push('/recipes');
  }

  if (loading) return <div style={{padding:16}}>Loading…</div>;
  if (!recipe) return <div style={{padding:16}}>Recipe not found.</div>;

  return (
    <div style={{ padding:16 }}>
      <h1>{recipe.title}</h1>
      <div className="small">{recipe.cuisine} • Serves {recipe.servings} • {recipe.nutrition?.kcal} kcal</div>

      <div className="card" style={{ marginTop:12 }}>
        <h3>Ingredients</h3>
        <ul>
          {recipe.ingredients.map((i, idx) => (
            <li key={idx}>
              {i.qty}{i.unit||''} {i.name} {hasIngredient(i.name) ? '✅' : '❌'}
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ marginTop:12 }}>
        <h3>Steps</h3>
        <ol>{recipe.steps.map((s,idx)=>(<li key={idx}>{s}</li>))}</ol>
      </div>

      <div style={{ marginTop:12 }}>
        <button className="btn primary" onClick={cookRecipe}>Cook Now</button>
      </div>
    </div>
  );
}
