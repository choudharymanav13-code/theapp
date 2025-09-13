
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
export default function Inventory(){
  const [items, setItems] = useState([])
  const load = async ()=>{
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending:false })
    if(!error && data) setItems(data)
  }
  useEffect(()=>{ load() }, [])
  const remove = async (id)=>{ await supabase.from('items').delete().eq('id', id); load() }
  return (
    <>
      <div className="header"><h1>Inventory</h1></div>
      <div className="content">
        <div className="row" style={{gap:8}}>
          <input className="input" placeholder="Search (e.g., dal, paneer)" />
          <a className="btn primary" href="/add-item">+ Add</a>
        </div>
        <div className="space"></div>
        <div className="list">
          {items.map(it => (
            <div key={it.id} className="list-item">
              <div>
                <div className="item-title">{it.name}</div>
                <div className="item-sub">{it.quantity} {it.unit} • {it.calories_per_100g} kcal/100g • Exp: {it.expiry_date}</div>
              </div>
              <button className="btn danger" onClick={()=>remove(it.id)}>Delete</button>
            </div>
          ))}
          {items.length===0 && <div className="small">No items yet. Add your first item →</div>}
        </div>
      </div>
    </>
  )
}
