'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function RecipeDetail() {
  const params = useParams();
  const id = params.id;

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cookSummary, setCookSummary] = useState(null);

  useEffect(() => {
    loadUserAndRecipe();
  }, []);

  async function loadUserAndRecipe() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    const res = await fetch(`/api/recipes?id=${id}`);
    const data = await res.json();
    setRecipe(Array.isArray(data) ? data[0] : data);
    setLoading(false);
  }

  async function cookRecipe() {
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

      setCookSummary({ recipe: recipe.title, results: data.results });
    } catch (err) {
      console.error('cookRecipe error', err);
      alert('Something went wrong while cooking.');
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!recipe) return <div style={{ padding: 16 }}>Recipe not found.</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1>{recipe.title}</h1>
      <div className="small">{recipe.cuisine} • Serves {recipe.servings}</div>
      <div style={{ marginTop: 12 }}>
        <strong>Ingredients:</strong>
        <ul>
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>{ing.name} — {ing.qty}{ing.unit}</li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: 12 }}>
        <strong>Instructions:</strong>
        <p>{recipe.instructions || 'No instructions provided.'}</p>
      </div>

      <button className="btn primary" style={{ marginTop: 16 }} onClick={cookRecipe}>
        Cook Now
      </button>

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
