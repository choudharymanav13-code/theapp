'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [error, setError] = useState('');

  async function signInWithGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  }

  async function signInEmail(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setError(error.message);
    setLoading(false);
  }

  async function sendOtp() {
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      phone
    });

    if (error) setError(error.message);
    else alert('OTP sent to your phone');

    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Pantry Coach</h1>
        <p className="auth-sub">Smart pantry. Smarter meals.</p>

        {/* Google */}
        <button className="btn primary full" onClick={signInWithGoogle} disabled={loading}>
          Continue with Google
        </button>

        <div className="divider">or</div>

        {/* Email */}
        <form onSubmit={signInEmail} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button className="btn full" type="submit" disabled={loading}>
            Sign in with Email
          </button>
        </form>

        {/* Phone OTP */}
        <button
          className="link-btn"
          onClick={() => setShowPhone(v => !v)}
        >
          {showPhone ? 'Hide phone login' : 'Use phone instead'}
        </button>

        {showPhone && (
          <div className="auth-form">
            <input
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <button className="btn full" onClick={sendOtp} disabled={loading}>
              Send OTP
            </button>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}
      </div>
    </div>
  );
}
