import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listQuotes, fetchHistory } from '../services/stockAPI';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

function MiniChartCard({ symbol, data, onClick }) {
  const last30 = useMemo(() => (data || []).slice(-30), [data]);
  return (
    <div className="card" style={{ cursor:'pointer' }} onClick={onClick} title={`Open ${symbol}`}>
      <div className="big" style={{ marginBottom: 6 }}>{symbol}</div>
      <div style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={last30}>
            <XAxis dataKey="date" hide />
            <YAxis domain={['auto','auto']} hide />
            <Tooltip />
            <Line type="monotone" dataKey="close" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function RandomCharts({ count = 6, enabled = false }) {
  const nav = useNavigate();
  const [symbols, setSymbols] = useState([]);
  const [series, setSeries] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!enabled) return;               // <-- do nothing if backend not OK
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await listQuotes(200, 0);
        const items = r?.data?.items || [];
        const uniq = [...new Set(items.map(x => (x.symbol || '').toUpperCase()))].filter(Boolean);

        const pick = [];
        const pool = [...uniq];
        while (pick.length < Math.min(count, pool.length)) {
          const i = Math.floor(Math.random() * pool.length);
          pick.push(pool.splice(i, 1)[0]);
        }
        if (cancelled) return;
        setSymbols(pick);

        const out = {};
        await Promise.all(pick.map(async sym => {
          try {
            const h = await fetchHistory(sym);
            out[sym] = h?.data?.rows || h?.data || [];
          } catch (e) {
            // per-symbol failure shouldn't break the whole grid
            out[sym] = [];
          }
        }));
        if (cancelled) return;
        setSeries(out);
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, count]);

  if (!enabled) {
    return (
      <div className="card">
        <div className="muted">Charts hidden while the backend is offline.</div>
      </div>
    );
  }

  if (loading) return <div className="muted">Loading charts…</div>;
  if (err) {
    return (
      <div className="card">
        <div className="muted">Couldn’t load charts: {err}</div>
      </div>
    );
  }
  if (!symbols.length) {
    return (
      <div className="card">
        <div className="muted">No symbols available yet.</div>
      </div>
    );
  }

  return (
    <div className="grid">
      {symbols.map(sym => (
        <MiniChartCard
          key={sym}
          symbol={sym}
          data={series[sym]}
          onClick={() => nav(`/stock/${sym}`)}
        />
      ))}
    </div>
  );
}
