'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function RecipeDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  async function fetchRecipe() {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      const all = await res.json();
      const found = all.find(r => String(r.id) === String(id));
      setRecipe(found || null);
    } catch (err) {
      console.error('fetchRecipe error:', err);
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }

  async function cookRecipe() {
    if (!recipe) return;

    const ingredientsList = recipe.ingredients
      .map(i => `- ${i.qty}${i.unit || ''} ${i.name}`)
      .join('\n');

    if (!confirm(`Cook "${recipe.title}"?\nThis will deduct:\n\n${ingredientsList}`)) {
      return;
    }

    let logs = [];
    for (const ing of recipe.ingredients) {
      const r = await fetch('/api/inventory/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ing)
      });
      const result = await r.json();
      if (result.error) {
        logs.push(`❌ ${ing.name}: ${result.error}`);
      } else {
        logs.push(`✅ ${ing.name}: ${result.message}`);
      }
    }

    alert(`Cooked ${recipe.title}!\n\n` + logs.join('\n'));
    router.push('/recipes'); // go back to recipes list
  }

  if (loading) {
    return <div style={{ padding: 16 }}>Loading recipe…</div>;
  }

  if (!recipe) {
    return <div style={{ padding: 16 }}>Recipe not found.</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>{recipe.title}</h1>
      <div className="small" style={{ marginBottom: 12 }}>
        {recipe.cuisine} • Serves {recipe.servings} • {recipe.nutrition?.kcal} kcal
      </div>

      {/* Ingredients list */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Ingredients</h3>
        <ul style={{ paddingLeft: 20 }}>
          {recipe.ingredients.map((i, idx) => (
            <li key={idx}>
              {i.qty}{i.unit || ''} {i.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Steps */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Steps</h3>
        <ol style={{ paddingLeft: 20 }}>
          {recipe.steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>
      </div>

      {/* Macros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Nutrition (per serving)</h3>
        <div>
          {recipe.nutrition?.kcal} kcal • P {recipe.nutrition?.protein}g C {recipe.nutrition?.carbs}g F {recipe.nutrition?.fat}g
        </div>
      </div>

      {/* Cook Now */}
      <button className="btn primary" onClick={cookRecipe}>
        Cook Now
      </button>
    </div>
  );
}
