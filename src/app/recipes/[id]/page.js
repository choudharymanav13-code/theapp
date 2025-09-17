'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function RecipeDetail({ params }) {
  const { id } = params;
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchRecipe(); }, [id]);

  async function fetchRecipe() {
    setLoading(true);
    const res = await fetch(`/api/recipes?q=${encodeURIComponent(id)}`);
    const j = await res.json();
    // API returns array; find by id
    const r = j.find(x => x.id === id) || j[0];
    setRecipe(r);
    setLoading(false);
  }

  async function cookNow() {
    // call cook API to deduct items
    const res = await fetch('/api/recipes/cook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipeId: id })
    });
    if (res.ok) {
      alert('Ingredients deducted from inventory (if present).');
      router.push('/inventory');
    } else {
      alert('Could not cook: ' + (await res.text()));
    }
  }

  if (loading) return <div className="small">Loading…</div>;
  if (!recipe) return <div className="small">Recipe not found</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1>{recipe.title}</h1>
      <div className="small">Serves {recipe.servings} • {recipe.cuisine} • {recipe.nutrition?.kcal} kcal</div>

      <div style={{ marginTop: 12 }}>
        <h3>Ingredients</h3>
        <ul>
          {recipe.ingredients.map((ing,i) => (
            <li key={i}>{ing.qty}{ing.unit} {ing.name}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 12 }}>
        <h3>Steps</h3>
        <ol>
          {recipe.steps.map((s,i) => (<li key={i}>{s}</li>))}
        </ol>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn primary" onClick={cookNow}>Cook Now (deduct ingredients)</button>
      </div>
    </div>
  );
}
