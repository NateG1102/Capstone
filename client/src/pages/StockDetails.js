// src/pages/StockDetails.js
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPrice, fetchHistory } from '../services/stockAPI';
import { fetchNews } from '../services/newsAPI';
import { fetchOwnership } from '../services/ownershipAPI';
import StockChatBox from '../components/StockChatBox';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function StockDetails() {
  const { symbol: routeSymbol } = useParams();
  const symbol = (routeSymbol || 'AAPL').toUpperCase();

  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(null);
  const [rows, setRows] = useState([]);
  const [news, setNews] = useState([]);
  const [ownership, setOwnership] = useState([]);

  useEffect(() => {
  let isMounted = true;
  setLoading(true);

  (async () => {
    const [p, h, n, o] = await Promise.allSettled([
      fetchPrice(symbol),
      fetchHistory(symbol),
      fetchNews(symbol, 8, 30),
      fetchOwnership(symbol),
    ]);

    if (!isMounted) return;

    // price
    if (p.status === 'fulfilled') setPrice(p.value?.data || null);
    else setPrice(null);

    // history
    if (h.status === 'fulfilled') {
      const hr = h.value?.data?.rows ?? h.value?.data ?? [];
      setRows(Array.isArray(hr) ? hr : []);
    } else {
      setRows([]);
    }

    // news
    if (n.status === 'fulfilled') {
      const items = Array.isArray(n.value?.data?.items) ? n.value.data.items : [];
      setNews(items);
    } else {
      setNews([]);
    }

    // ownership
    if (o.status === 'fulfilled') {
      const holders = Array.isArray(o.value?.data?.holders) ? o.value.data.holders : [];
      setOwnership(holders);
    } else {
      setOwnership([]);
    }

    setLoading(false);
  })();

  return () => { isMounted = false; };
}, [symbol]);


  // === Range state, slicer, and helpers ===
const [range, setRange] = useState('1m'); // '1w' | '1m' | '6m' | '1y'

const rangedRows = useMemo(() => {
  if (!rows?.length) return [];
  const days =
    range === '1w' ? 7 :
    range === '1m' ? 30 :
    range === '6m' ? 182 : 365;

  // figure out cutoff date
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // rows may have date as string; normalize and add 'iso' for XAxis
  const within = rows.filter(r => {
    const d = r.date instanceof Date ? r.date : new Date(r.date);
    return d >= cutoff;
  });

  const data = (within.length ? within : rows).map(r => {
    const d = r.date instanceof Date ? r.date : new Date(r.date);
    return { ...r, iso: d.toISOString() };
  });

  return data;
}, [rows, range]);

// formatters
const fmtX = (iso) => {
  const d = new Date(iso);
  if (range === '1w' || range === '1m') {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};
const fmtY = v => `$${v}`;
const tooltipValue = v => [`$${Number(v).toFixed(2)}`, 'Close'];
const tooltipLabel = label => new Date(label).toLocaleString(undefined, { dateStyle: 'medium' });

// small styled button
const RangeBtn = ({ value, children }) => (
  <button
    onClick={() => setRange(value)}
    aria-pressed={range === value}
    style={{
      padding: '8px 12px',
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: range === value ? 'var(--accent)' : 'var(--card)',
      color: range === value ? '#fff' : 'var(--text)',
      cursor: 'pointer',
      fontWeight: 600
    }}
  >
    {children}
  </button>
);


  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
          <h2 style={{ margin: 0 }}>{symbol}</h2>
          {price?.price != null && (
            <div className="big">
              ${Number(price.price).toFixed(2)}
              {price.change != null && (
                <span style={{ marginLeft: 8, color: (Number(price.change) >= 0 ? 'var(--success)' : 'var(--danger)') }}>
                  {Number(price.change).toFixed(2)} ({price.changePercent})
                </span>
              )}
            </div>
          )}
          {loading && <span className="muted small">loading…</span>}
        </div>
      </div>

      {/* Main content: chart + news */}
      <div className="grid">
        {/* Chart with duration controls */}
<div className="card">
  <div className="big" style={{ marginBottom: 8 }}>Price Trend</div>

  {/* Duration buttons */}
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
    <span className="muted" style={{ alignSelf: 'center', marginRight: 6 }}>Duration:</span>
    <RangeBtn value="1w">1W</RangeBtn>
    <RangeBtn value="1m">1M</RangeBtn>
    <RangeBtn value="6m">6M</RangeBtn>
    <RangeBtn value="1y">1Y</RangeBtn>
  </div>

  <div style={{ height: 300 }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rangedRows}>
        <CartesianGrid strokeDasharray="3 3" />
        {/* we use 'iso' we computed in Block #1 so ticks are consistent */}
        <XAxis dataKey="iso" tickFormatter={fmtX} minTickGap={24} />
        <YAxis domain={['auto','auto']} tickFormatter={fmtY} width={60} />
        <Tooltip labelFormatter={tooltipLabel} formatter={tooltipValue} />
        <Line type="monotone" dataKey="close" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </div>

  <div className="small muted">
    Showing {rangedRows.length} points — {range.toUpperCase()} view.
  </div>
</div>


        {/* News */}
        <div className="card">
          <div className="big" style={{ marginBottom: 8 }}>News</div>
          {!news.length ? (
            <div className="muted">No news yet.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {news.slice(0,10).map((a, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {/* Alpha Vantage NEWS_SENTIMENT uses `link` */}
                  <a href={a.link} target="_blank" rel="noreferrer">{a.title}</a>
                  {a.source && <span className="small muted"> — {a.source}</span>}
                  {a.publishedAt && <div className="small muted">{new Date(a.publishedAt).toLocaleString()}</div>}
                  {typeof a.sentimentScore === 'number' && a.sentimentLabel ? (
                    <div className="small muted">
                      {a.sentimentLabel} ({a.sentimentScore.toFixed(2)})
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Ownership + Chat */}
      <div className="grid">
        <div className="card">
          <div className="big" style={{ marginBottom: 8 }}>Institutional Ownership</div>
          {!ownership.length ? (
            <div className="muted">No ownership data.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Shares</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {ownership.map((h, i) => (
                  <tr key={i}>
                    <td><a href={h.filing || '#'} target="_blank" rel="noreferrer">{h.institution}</a></td>
                    <td>{Number(h.shares || 0).toLocaleString()}</td>
                    <td>{h.percent != null ? `${Number(h.percent).toFixed(2)}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="small muted" style={{ marginTop: 6 }}>
            May include sample/fallback data if no API key is configured.
          </div>
        </div>

        <div className="card">
          <div className="big" style={{ marginBottom: 8 }}>Chat</div>
          <StockChatBox
            symbol={symbol}
            context={
              price?.price != null
                ? `${symbol} | last ${Number(price.price).toFixed(2)} | ${Number(price.change || 0).toFixed(2)} (${price.changePercent})`
                : `${symbol} | no price yet`
            }
          />
          <div className="small muted">Answers are for learning only — not financial advice.</div>
        </div>
      </div>
    </div>
  );
}
