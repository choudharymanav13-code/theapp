
'use client'
import { useState } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
function daysFromNow(d){ const dt=new Date(); dt.setDate(dt.getDate()+d); const y=dt.getFullYear(), m=('0'+(dt.getMonth()+1)).slice(-2), da=('0'+dt.getDate()).slice(-2); return `${y}-${m}-${da}` }
function shelfLifeDaysFor(name){
  if(!name) return null
  const n = name.toLowerCase()
  const rules = [
    [/paneer|cottage\s*cheese/,7],
    [/curd|yoghurt|yogurt|dahi/,7],
    [/milk/,5],
    [/cheese/,14],
    [/bread|bun|loaf/,5],
    [/egg(s)?/,21],
    [/chicken|fish|mutton|meat/,2],
    [/cooked|leftover/,3],
    [/spinach|palak|greens|cilantro|coriander|mint/,3],
    [/tomato|onion|potato/,14],
    [/banana|apple|fruit/,5],
    [/rice|basmati|brown\s*rice/,365],
    [/atta|flour|maida|rava|suji/,180],
    [/dal|lentil|toor|moong|chana|urad/,365],
    [/sugar|salt/,365],
    [/oil|ghee/,365],
    [/spice|masala|turmeric|chilli|cumin|garam/,540],
    [/biscuits|cookies|chips|snack/,120],
    [/butter|margarine/,60]
  ]
  for (const [re, days] of rules){ if(re.test(n)) return days }
  if(/dairy|milk|curd|paneer/.test(n)) return 7
  if(/vegetable|veg|leafy|greens/.test(n)) return 4
  if(/grain|cereal|pulse|legume/.test(n)) return 300
  if(/frozen/.test(n)) return 180
  return 30
}
export default function AddItem(){
  const [name,setName]=useState('')
  const [qty,setQty]=useState('')
  const [unit,setUnit]=useState('g')
  const [cal,setCal]=useState('')
  const [exp,setExp]=useState('')
  const autoFill=()=>{ const d=shelfLifeDaysFor(name); if(d) setExp(daysFromNow(d)); else alert('Could not infer expiry; please enter manually.') }
  const save=async(e)=>{
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if(!user) return alert('You must be signed in.')
    if(!name || !qty || !cal || !exp) return alert('All fields are required.')
    const { error } = await supabase.from('items').insert({
      user_id: user.id,
      name,
      quantity: Number(qty),
      unit,
      calories_per_100g: Number(cal),
      expiry_date: exp
    })
    if(error) alert(error.message); else window.location.href='/inventory'
  }
  return (
    <>
      <div className="header"><h1>Add Item</h1></div>
      <div className="content">
        <form className="card" style={{display:'grid',gap:12}} onSubmit={save}>
          <label className="label">Item name</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Amul Paneer" required/>
          <div className="row">
            <div style={{flex:2}}>
              <label className="label">Quantity</label>
              <input className="input" type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="e.g., 200" required/>
            </div>
            <div style={{flex:1}}>
              <label className="label">Unit</label>
              <select className="input" value={unit} onChange={e=>setUnit(e.target.value)}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="count">count</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div style={{flex:1}}>
              <label className="label">Calories per 100g/unit</label>
              <input className="input" type="number" value={cal} onChange={e=>setCal(e.target.value)} placeholder="e.g., 265" required/>
            </div>
            <div style={{flex:1}}>
              <label className="label">Expiry date <span className="note">(required)</span></label>
              <div className="row" style={{gap:8}}>
                <input className="input" type="date" value={exp} onChange={e=>setExp(e.target.value)} required/>
                <button type="button" className="inline-btn" onClick={autoFill}>Autofill (AI)</button>
              </div>
              <div className="small">Estimated from typical shelf life (you can adjust).</div>
            </div>
          </div>
          <button className="btn primary" type="submit">Save item</button>
        </form>
        <div className="space"></div>
        <div className="card" style={{display:'grid',gap:8}}>
          <div className="label">Paste receipt text (from iPhone OCR)</div>
          <textarea className="input" rows={4} placeholder="e.g., Amul Paneer 200g, Mother Dairy Curd 500g..."></textarea>
          <button className="btn">Parse & suggest (coming in Phase 3)</button>
        </div>
      </div>
    </>
  )
}
