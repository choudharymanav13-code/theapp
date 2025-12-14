'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function signInWithGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    setLoading(false);
  }

  async function signInWithEmail() {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function sendOtp() {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone
    });
    if (error) setError(error.message);
    else setOtpSent(true);
    setLoading(false);
  }

  return (
    <div className="login-bg">
      <div className="login-glass slide-in">
        <h1 className="login-title">Pantry Coach</h1>
        <p className="login-sub">Smart pantry. Smarter meals.</p>

        <button className="btn google" onClick={signInWithGoogle} disabled={loading}>
          Continue with Google
        </button>

        <div className="divider">OR</div>

        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <div className="row">
          <button className="btn" onClick={signInWithEmail} disabled={loading}>
            Sign In
          </button>
          <button className="btn ghost" onClick={signUpWithEmail} disabled={loading}>
            Sign Up
          </button>
        </div>

        <div className="divider">OR</div>

        <input
          className="input"
          placeholder="Phone (+91XXXXXXXXXX)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />

        <button className="btn" onClick={sendOtp} disabled={loading}>
          {otpSent ? 'OTP Sent' : 'Send OTP'}
        </button>

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
