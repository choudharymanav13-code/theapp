
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
function toast(msg){
  const t = document.createElement('div')
  t.textContent = msg
  Object.assign(t.style,{position:'fixed',bottom:'80px',left:'50%',transform:'translateX(-50%)',background:'#111827',border:'1px solid #334155',padding:'10px 14px',borderRadius:'12px',color:'#e5e7eb',zIndex:9999})
  document.body.appendChild(t); setTimeout(()=>t.remove(),1500)
}
export default function Home(){
  const [email, setEmail] = useState('')
  const [session, setSession] = useState(null)
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=> setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s)=> setSession(s))
    return () => sub.subscription.unsubscribe()
  },[])
  const sendMagicLink = async (e)=>{
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if(error) toast(error.message); else toast('Check your email for the login link!')
  }
  const signOut = async ()=>{ await supabase.auth.signOut() }
  return (
    <>
      <div className="header"><h1>Pantry Coach</h1></div>
      <div className="content">
        {!session ? (
          <div className="card" style={{display:'grid',gap:12}}>
            <div className="kpi"><div className="val">Welcome 👋</div>
              <div className="small">Login with your email (magic link)</div></div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
            <button className="btn primary" onClick={sendMagicLink}>Send login link</button>
          </div>
        ) : (
          <>
            <div className="grid grid-2">
              <div className="card kpi"><div className="small">Inventory items</div><div className="val">—</div></div>
              <div className="card kpi"><div className="small">Today</div><div className="val">— kcal</div><div className="small">Goal —</div></div>
            </div>
            <div className="space"></div>
            <div className="grid grid-3">
              <a className="btn primary" href="/add-item">+ Add Item</a>
              <a className="btn" href="/log-meal">+ Log Meal</a>
              <a className="btn" href="/recipes">View Recipes</a>
            </div>
            <div className="space"></div>
            <button className="btn" onClick={signOut}>Sign out ({session.user.email})</button>
          </>
        )}
        <p className="small" style={{marginTop:16}}>Install on iPhone: Share → Add to Home Screen</p>
      </div>
    </>
  )
}
