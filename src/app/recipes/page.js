'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
  }, []);

  async function fetchRecipes() {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      setRecipes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Recipes</h1>
        <Link href="/recipes/add" className="btn primary">Add Recipe</Link>
      </div>

      {loading && <div className="small">Loading recipes…</div>}

      {!loading && recipes.length === 0 && (
        <div className="card small">No recipes found.</div>
      )}

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {recipes.map(recipe => (
          <div key={recipe.id} className="card">
            <div style={{ fontWeight: 700 }}>{recipe.title}</div>
            <div className="small">
              {recipe.cuisine} • Serves {recipe.servings}
            </div>

            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <Link href={`/recipes/${recipe.id}`} className="btn">
                View
              </Link>
              <Link href={`/recipes/${recipe.id}`} className="btn">
                Cook Now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
