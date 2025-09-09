import { useEffect, useMemo, useState } from 'react';
import { fetchPrice, fetchHistory } from '../services/stockAPI';
import { fetchNews } from '../services/newsAPI';
import { fetchOwnership } from '../services/ownershipAPI';
import StockChatBox from '../components/StockChatBox';

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

export default function Home() {
  const [symbol, setSymbol] = useState('AAPL');
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(null);
  const [rows, setRows] = useState([]);          // full history
  const [range, setRange] = useState('1m');      // 1w | 1m | 6m | 1y
  const [news, setNews] = useState([]);
  const [owners, setOwners] = useState([]);

  // slice data for selected range
  const data = useMemo(() => {
    if (!rows.length) return [];
    const take = { '1w': 7, '1m': 30, '6m': 180, '1y': 365 }[range] || 30;
    return rows.slice(-take).map(d => ({ ...d, shortDate: d.date.slice(5) }));
  }, [rows, range]);

  async function loadAll(s) {
    try {
      setLoading(true);
      const [p, h, n, o] = await Promise.all([
        fetchPrice(s),
        fetchHistory(s),
        fetchNews(s),
        fetchOwnership(s)
      ]);
      setPrice(p.data);
      setRows(h.data?.rows || []);
      setNews(n.data?.articles || []);
      setOwners((o.data?.holders || []).slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // initial load
  useEffect(() => { loadAll(symbol); }, []); // eslint-disable-line

  function onSubmit(e) {
    e.preventDefault();
    const input = e.target.elements.ticker.value.trim().toUpperCase();
    if (input) {
      setSymbol(input);
      loadAll(input);
    }
  }

  const change = price?.changePercent ? price.changePercent.replace('%', '') : null;

  return (
    <div className="container">
      <h1 className="title">Stock Dashboard (Demo)</h1>

      {/* Search */}
      <form onSubmit={onSubmit} className="row">
        <input name="ticker" placeholder="Enter symbol (e.g., AAPL)" defaultValue={symbol} />
        <button type="submit">Load</button>
      </form>

      {/* Price & Range */}
      <div className="grid">
        <div className="card">
          <div className="muted">Symbol</div>
          <div className="big">{price?.symbol || symbol}</div>
          <div className="muted">Price</div>
          <div className="big">{price?.price ? Number(price.price).toFixed(2) : '—'}</div>
          <div className={`badge ${change ? (+change >= 0 ? 'up' : 'down') : ''}`}>
            {price?.changePercent || '--'}
          </div>
          {loading && <div className="muted">Loading…</div>}
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Price (close)</strong>
            <div className="seg">
              {['1w','1m','6m','1y'].map(r => (
                <button
                  key={r}
                  className={`segbtn ${range === r ? 'active' : ''}`}
                  onClick={() => setRange(r)}
                  type="button"
                >{r}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 240, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shortDate" hide={range==='1y'} />
                <YAxis domain={['auto','auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="close" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* News & Ownership */}
      <div className="grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>News</h3>
          {news.length === 0 && <div className="muted">No articles.</div>}
          <ul className="list">
            {news.map((a, i) => (
              <li key={i}>
                <a href={a.url || '#'} target="_blank" rel="noreferrer">{a.title}</a>
                <div className="muted">{a.source} • {new Date(a.publishedAt).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Institutional Ownership (Top)</h3>
          {owners.length === 0 && <div className="muted">No data.</div>}
          <table className="table">
            <thead>
              <tr><th>Institution</th><th>Shares</th><th>%</th></tr>
            </thead>
            <tbody>
              {owners.map((h, i) => (
                <tr key={i}>
                  <td>{h.institution}</td>
                  <td>{h.shares?.toLocaleString?.() || h.shares}</td>
                  <td>{h.percent != null ? `${h.percent}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-stock chat */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Ask about {symbol}</h3>
        <StockChatBox symbol={symbol} rows={data} />
        <div className="muted small">Answers are for learning only — not financial advice.</div>
      </div>
    </div>
  );
}
