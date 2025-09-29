import SearchBar from '../components/SearchBar';
import RandomCharts from '../components/RandomCharts';
import StockChatBox from '../components/StockChatBox';

import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8081';

export default function Home() {
  const [backendOk, setBackendOk] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await axios.get(`${API_BASE}/api/test`, { timeout: 3000 });
        if (!cancelled) setBackendOk(true);
      } catch (e) {
        console.warn('[health] backend unreachable:', e?.message || e);
        if (!cancelled) setBackendOk(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="container">
      {/* Hero */}
      <div className="card" style={{
        padding: 24,
        display: 'grid',
        gridTemplateColumns: '1fr 180px',
        gap: 16,
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.2 }}>
            Welcome to <span style={{ background: 'var(--grad1)', WebkitBackgroundClip:'text', color:'transparent' }}>StockSyncer</span>
          </h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Explore market trends, read the latest news, and chat about any ticker.
          </p>
        </div>
        <div style={{
          width: 160, height: 160, border:'1px dashed var(--border)',
          borderRadius: 16, display:'grid', placeItems:'center', justifySelf:'end',
          background:'var(--card)'
        }}>
          <span className="muted small">Your Logo</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginTop: 16 }}>
        <SearchBar />
      </div>

      {/* Optional: status banner */}
      {!checking && !backendOk && (
        <div className="card" style={{ marginTop: 16, borderColor: 'hsla(0 85% 60% / .35)' }}>
          <div className="big" style={{ marginBottom: 6 }}>Backend not reachable</div>
          <div className="small muted">
            Couldn’t reach <code>{API_BASE}</code>. Start your server (8081) or set
            <code> REACT_APP_API_BASE</code> in <code>client/.env</code> and restart <code>npm start</code>.
          </div>
        </div>
      )}

      {/* Random relevant charts — gated by backendOk */}
      <div style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 8px' }}>Trending symbols</h3>
        <RandomCharts count={6} enabled={backendOk} />
      </div>
    </div>
  );
}
