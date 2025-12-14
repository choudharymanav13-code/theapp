'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRecipe, setActiveRecipe] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: inv } = await supabase
      .from('items')
      .select('name');

    const inventoryNames = (inv || []).map(i =>
      i.name.toLowerCase()
    );
    setInventory(inventoryNames);

    const res = await fetch('/api/recipes');
    const allRecipes = await res.json();

    const enriched = (allRecipes || [])
      .map(r => {
        const required = r.ingredients || [];
        const have = required.filter(i =>
          inventoryNames.some(n =>
            n.includes(i.name.toLowerCase())
          )
        );
        const missing = required.length - have.length;
        return { ...r, haveCount: have.length, missing };
      })
      .filter(r => r.missing <= 2);

    setRecipes(enriched);
    setLoading(false);
  }

  return (
    <div className="page">
      <h1>Recipes</h1>
      <div className="small">Recipes you can almost cook right now</div>

      {loading ? (
        <div className="card">Loading recipes…</div>
      ) : recipes.length === 0 ? (
        <div className="card small">
          No recipes match your pantry yet. Add 1–2 items.
        </div>
      ) : (
        <div className="grid">
          {recipes.map(r => (
            <div key={r.id} className="recipe-card">
              <div>
                <div className="recipe-title">{r.title}</div>
                <div className="small">
                  {r.cuisine} • {r.servings} servings
                </div>
                <div className="badge">
                  {r.haveCount}/{r.ingredients.length} ingredients
                </div>
              </div>

              <button
                className="btn primary"
                onClick={() => setActiveRecipe(r)}
              >
                Cook Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {activeRecipe && (
        <div className="modal-backdrop" onClick={() => setActiveRecipe(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{activeRecipe.title}</h2>
            <div className="small">{activeRecipe.cuisine}</div>

            <div style={{ marginTop: 12 }}>
              {activeRecipe.ingredients.map((i, idx) => {
                const have = inventory.some(n =>
                  n.includes(i.name.toLowerCase())
                );
                return (
                  <div
                    key={idx}
                    className={`ingredient ${have ? 'have' : 'missing'}`}
                  >
                    {have ? '✔' : '✖'} {i.name}
                  </div>
                );
              })}
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setActiveRecipe(null)}>
                Close
              </button>
              <button className="btn primary">
                Start Cooking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
