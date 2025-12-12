// src/app/recipes/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadUserAndRecipe() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user || null);

    try {
      const res = await fetch(`/api/recipes?id=${encodeURIComponent(id)}`);
      const j = await res.json();
      const r = Array.isArray(j) ? j[0] : j;
      setRecipe(r || null);
    } catch (e) {
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  }

  async function cookRecipe() {
    if (!confirm(`Cook "${recipe.title}"?\nThis will deduct ingredients from your pantry.`)) return;
    try {
      const res = await fetch('/api/recipes/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id, user_id: user?.id })
      });
      const data = await res.json();
      if (data.error) { alert('Error: ' + data.error); return; }
      setCookSummary({ recipe: recipe.title, results: data.results });
    } catch (err) {
      console.error('cookRecipe error', err);
      alert('Something went wrong while cooking.');
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!recipe) return <div style={{ padding: 16 }}>Recipe not found.</div>;

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1>{recipe.title}</h1>
          <div className="small">{recipe.cuisine} • Serves {recipe.servings}</div>
        </div>
        <div>
          <Link href="/recipes" className="btn">Back</Link>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="card">
          <strong>Ingredients</strong>
          <ul style={{ marginTop:8 }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="small">{ing.name} — {ing.qty}{ing.unit}</li>
            ))}
          </ul>
        </div>

        <div style={{ marginTop: 12 }} className="card">
          <strong>Instructions</strong>
          <div style={{ marginTop:8 }} className="small">{recipe.instructions || 'No instructions provided.'}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={cookRecipe}>Cook Now</button>
        </div>
      </div>

      {/* Cook Summary Modal */}
      {cookSummary && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Cooked {cookSummary.recipe}</h2>
            <div className="list" style={{ marginTop: 8 }}>
              {cookSummary.results.map((r, i) => (
                <div key={i} className={`list-item ${r.ok ? 'success' : 'fail'}`}>
                  <div>
                    <div className="item-title">{r.matchedWith ?? r.name ?? 'Unknown'}</div>
                    <div className="item-sub">
                      {r.ok ? `✔ Deducted ${r.deducted}${r.unit} • Remaining: ${r.remaining}` : `❌ ${r.error}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div className="small">{cookSummary.results.filter(x=>x.ok).length} succeeded • {cookSummary.results.filter(x=>!x.ok).length} failed</div>
              <button className="btn primary" onClick={() => { setCookSummary(null); window.location.href = '/recipes'; }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
