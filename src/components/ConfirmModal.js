// src/components/ConfirmModal.js
'use client';

import { useEffect } from 'react';

export default function ConfirmModal({ open, onClose, onConfirm, items }) {
  // close on ESC
  useEffect(() => {
    function handler(e) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 400,
          background: '#111',
          color: '#fff',
          padding: 20,
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginBottom: 10 }}>Confirm Cooking</h2>
        <div className="small" style={{ marginBottom: 12 }}>
          These ingredients will be deducted from your pantry:
        </div>
        <ul style={{ margin: '0 0 12px 0', padding: 0, listStyle: 'none' }}>
          {items.map((it, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              {it.qty} {it.unit} {it.name}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
