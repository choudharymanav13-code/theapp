'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function NewRecipe() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [cuisine, setCuisine] = useState('Indian');
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState([{ name:'', qty:100, unit:'g' }]);
  const [steps, setSteps] = useState(['']);

  function updateIngredient(i, field, val) {
    const copy = [...ingredients]; copy[i][field] = val; setIngredients(copy);
  }
  function addIng(){ setIngredients([...ingredients,{name:'',qty:100,unit:'g'}]); }
  function removeIng(i){ setIngredients(ingredients.filter((_,idx)=>idx!==i)); }
  function addStep(){ setSteps([...steps,'']); }
  function updateStep(i,val){ const c=[...steps]; c[i]=val; setSteps(c); }

  async function save(e){
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Sign in first');
    // store in supabase `recipes` table (you may need to create it)
    const payload = {
      title, cuisine, servings, ingredients, steps, created_by: user.id
    };
    const { error } = await supabase.from('recipes').insert(payload);
    if (error) alert(error.message); else {
      alert('Saved'); router.push('/recipes');
    }
  }

  return (
    <div style={{ padding:16 }}>
      <h1>Add Recipe</h1>
      <form onSubmit={save} className="card" style={{ display:'grid', gap:8 }}>
        <label>Title</label>
        <input className="input" value={title} onChange={e=>setTitle(e.target.value)} required />
        <label>Cuisine</label>
        <select className="input" value={cuisine} onChange={e=>setCuisine(e.target.value)}>
          <option>Indian</option><option>Global</option><option>Other</option>
        </select>
        <label>Servings</label>
        <input className="input" type="number" value={servings} onChange={e=>setServings(Number(e.target.value))} />

        <h3>Ingredients</h3>
        {ingredients.map((ing,i)=>(
          <div key={i} className="row" style={{ gap:8 }}>
            <input className="input" placeholder="Name" value={ing.name} onChange={e=>updateIngredient(i,'name',e.target.value)} required />
            <input className="input" type="number" value={ing.qty} onChange={e=>updateIngredient(i,'qty',Number(e.target.value))} />
            <input className="input" value={ing.unit} onChange={e=>updateIngredient(i,'unit',e.target.value)} />
            <button type="button" onClick={()=>removeIng(i)}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addIng}>+ Add Ingredient</button>

        <h3>Steps</h3>
        {steps.map((s,i)=>(
          <input key={i} className="input" value={s} onChange={e=>updateStep(i,e.target.value)} placeholder={`Step ${i+1}`} />
        ))}
        <button type="button" onClick={addStep}>+ Add Step</button>

        <button className="btn primary" type="submit">Save Recipe</button>
      </form>
    </div>
  );
}
