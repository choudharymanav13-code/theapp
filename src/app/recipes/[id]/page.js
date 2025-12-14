'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function RecipeDetailPage() {
  const params = useParams();
  const recipeId = params.id;

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  async function loadRecipe() {
    try {
      const res = await fetch('/api/recipes');
      const all = await res.json();

      const found = all.find(r => r.id === recipeId);
      setRecipe(found || null);
    } catch (e) {
      console.error(e);
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 16 }}>Loading recipe…</div>;
  }

  if (!recipe) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Recipe not found</h2>
        <Link href="/recipes" className="btn">Back</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>{recipe.title}</h1>
      <div className="small">{recipe.cuisine} • Serves {recipe.servings}</div>

      <div className="card" style={{ marginTop: 12 }}>
        <strong>Ingredients</strong>
        <ul>
          {recipe.ingredients.map((i, idx) => (
            <li key={idx}>
              {i.name} – {i.qty} {i.unit}
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <strong>Steps</strong>
        <ol>
          {recipe.steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>
      </div>

      <div style={{ marginTop: 12 }}>
        <Link href="/recipes" className="btn">Back to Recipes</Link>
      </div>
    </div>
  );
}
