'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function CookHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('meal_log')
      .select('*')
      .eq('user_id', user.id)
      .order('cooked_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('CookHistory load error:', error);
      setLogs([]);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Cook History</h1>
      {loading ? (
        <div className="small">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="small">No recipes cooked yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {logs.map((log) => (
            <div key={log.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{log.title}</div>
                  <div className="small">
                    {new Date(log.cooked_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="small">
                    {log.results.filter(r => r.ok).length} success •{' '}
                    {log.results.filter(r => !r.ok).length} fail
                  </div>
                </div>
              </div>

              {/* Collapsible details */}
              <details style={{ marginTop: 8 }}>
                <summary className="small">View details</summary>
                <div className="list" style={{ marginTop: 4 }}>
                  {log.results.map((r, i) => (
                    <div key={i} className={`list-item ${r.ok ? 'success' : 'fail'}`}>
                      <div className="item-title">{r.name || 'Unknown'}</div>
                      <div className="item-sub">
                        {r.ok
                          ? `✔ Deducted ${r.deducted}${r.unit} • Remaining: ${r.remaining}`
                          : `❌ ${r.error}`}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
