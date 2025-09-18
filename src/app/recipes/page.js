// src/app/recipes/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import ConfirmModal from '../../components/ConfirmModal';

export default function RecipesList() {
  // data + loading
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  // user inventory (names)
  const [inventoryNames, setInventoryNames] = useState([]);

  // filters/search
  const [q, setQ] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [calories, setCalories] = useState('');
  const [suggest, setSuggest] = useState(false);

  // modal / cooking states
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingRecipe, setPendingRecipe] = useState(null);
  const [cooking, setCooking] = useState(false);

  useEffect(() => { loadInventoryNames(); }, []);

  // refetch when inventory or filters change
  useEffect(() => { fetchRecipes(); }, [inventoryNames, q, cuisine, calories, suggest]);

  async function loadInventoryNames() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setInventoryNames([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('items').select('name');
      setInventoryNames((data || []).map(i => i.name.toLowerCase()));
    } catch (err) {
      console.error('loadInventoryNames err', err);
      setInventoryNames([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecipes() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // include inventory[] only if we have it (helps suggestion logic)
      inventoryNames.forEach(n => params.append('inventory[]', n));
      if (q) params.set('q', q);
      if (cuisine) params.set('cuisine', cuisine);
      if (calories) params.set('calories', calories);
      if (suggest) params.set('suggest', 'true');

      const res = await fetch(`/api/recipes?${params.toString()}`);
      if (!res.ok) throw new Error(`recipes fetch failed ${res.status}`);
      const j = await res.json();
      setRecipes(Array.isArray(j) ? j : []);
    } catch (err) {
      console.error('fetchRecipes error:', err);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  // open the confirmation modal
  function handleCook(recipe) {
    setPendingRecipe(recipe);
    setModalOpen(true);
  }

  // confirm -> cook
  async function confirmCook() {
    if (!pendingRecipe) return;
    setCooking(true);

    try {
      // call recipes cook route to get ingredient list
      const cookRes = await fetch('/api/recipes/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: pendingRecipe.id }),
      });
      const cookData = await cookRes.json();
      if (!cookRes.ok) {
        alert(`Could not get recipe ingredients: ${cookData?.error || cookRes.status}`);
        return;
      }
      const ingredients = cookData.ingredients || [];
      if (!ingredients.length) {
        alert('No ingredients returned for this recipe.');
        return;
      }

      // get current user id once
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Sign in required to cook.'); return; }
      const uid = user.id;

      // iterate ingredients (simple 1-per-request approach)
      const logs = [];
      for (const ing of ingredients) {
        // normalize fields presence
        const name = ing.name || ing.item || ing.label || '';
        const qty = ing.qty ?? ing.quantity ?? ing.amount ?? 100;
        const unit = ing.unit ?? 'g';

        try {
          const r = await fetch('/api/inventory/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, qty, unit, user_id: uid }),
          });
          const json = await r.json();
          if (!r.ok) {
            // non-2xx
            logs.push(`❌ ${name}: ${json?.error || 'failed'}`);
          } else {
            // success object may include deleted flag
            if (json.deleted) logs.push(`✅ ${name}: deducted ${qty}${unit} — item removed from pantry`);
            else logs.push(`✅ ${name}: ${json.message || 'deducted'} — remaining ${json.remaining ?? 'unknown'}`);
          }
        } catch (err) {
          console.error('deduct err', err);
          logs.push(`❌ ${name}: network or server error`);
        }
      }

      // show summary
      alert(`Cooked "${pendingRecipe.title}"\n\n${logs.join('\n')}`);

      // refresh inventory and recipes to update match counts
      await loadInventoryNames();
      await fetchRecipes();
    } finally {
      setCooking(false);
      setModalOpen(false);
      setPendingRecipe(null);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Recipes</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search recipes..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 2 }}
        />
        <select className="input" value={cuisine} onChange={e => setCuisine(e.target.value)}>
          <option value="">All cuisines</option>
          <option value="indian">Indian</option>
          <option value="italian">Italian</option>
          <option value="mexican">Mexican</option>
          <option value="chinese">Chinese</option>
          <option value="global">Global</option>
        </select>
        <select className="input" value={calories} onChange={e => setCalories(e.target.value)}>
          <option value="">Any kcal</option>
          <option value="200">≤ 200</option>
          <option value="500">≤ 500</option>
          <option value="800">≤ 800</option>
        </select>
        <button
          className={`btn ${suggest ? 'primary' : ''}`}
          onClick={() => setSuggest(!suggest)}
        >
          {suggest ? 'Showing Suggestions' : 'Suggest Recipes'}
        </button>
      </div>

      {/* Content */}
      <div style={{ marginTop: 12 }}>
        {loading ? (
          /* simple skeleton placeholders (you added skeleton styles in globals.css) */
          <div style={{ display: 'grid', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton title" style={{ width: '40%' }}></div>
                  <div className="skeleton text"></div>
                </div>
                <div style={{ width: 80 }}>
                  <div className="skeleton text" style={{ width: 60 }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="small">⚠️ No recipes found. Try adjusting filters or add your own!</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {recipes.map(r => (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.title}</div>
                    <div className="small">{r.cuisine} • Serves {r.servings} • {r.nutrition?.kcal} kcal</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{r.match_count ?? '-'}/{r.required_count ?? r.ingredients.length}</div>
                    <div className="small">{(r.missing_count ?? 0) === 0 ? 'Complete' : `${r.missing_count} missing`}</div>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <Link href={`/recipes/${r.id}`} className="btn">View</Link>

                  <button
                    className="btn"
                    style={{ marginLeft: 8 }}
                    onClick={() => handleCook(r)}
                    disabled={cooking}
                  >
                    {cooking && pendingRecipe?.id === r.id ? 'Cooking…' : 'Cook Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add recipe button (kept as requested) */}
      <div style={{ marginTop: 16 }}>
        <Link href="/recipes/add" className="btn primary">+ Add Recipe</Link>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmCook}
        // show simple list (qty+unit+name) — ConfirmModal expects items array
        items={(pendingRecipe?.ingredients || []).map(it => ({
          name: it.name || it.item || '',
          qty: it.qty ?? it.quantity ?? it.amount ?? 100,
          unit: it.unit ?? 'g'
        }))}
      />
    </div>
  );
}
