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


  const last180 = useMemo(() => rows.slice(-180), [rows]);

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
        {/* Chart */}
        <div className="card">
          <div className="big" style={{ marginBottom: 8 }}>Price Trend</div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last180}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={['auto','auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="close" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="small muted">Daily close — last {last180.length} sessions.</div>
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
