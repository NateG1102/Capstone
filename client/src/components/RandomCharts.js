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

export default function RandomCharts({ count = 6 }) {
  const nav = useNavigate();
  const [symbols, setSymbols] = useState([]);
  const [series, setSeries] = useState({});  // {SYM: rows[]}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // get a pool of recent symbols from your DB
        const r = await listQuotes(200, 0);
        const items = r?.data?.items || [];
        const uniq = [...new Set(items.map(x => (x.symbol || '').toUpperCase()))].filter(Boolean);

        // sample a few randomly
        const pick = [];
        const pool = [...uniq];
        while (pick.length < Math.min(count, pool.length)) {
          const i = Math.floor(Math.random()*pool.length);
          pick.push(pool.splice(i,1)[0]);
        }
        setSymbols(pick);

        // fetch history for each
        const out = {};
        await Promise.all(pick.map(async sym => {
          const h = await fetchHistory(sym);
          out[sym] = h?.data?.rows || h?.data || [];
        }));
        setSeries(out);
      } finally {
        setLoading(false);
      }
    })();
  }, [count]);

  if (loading) return <div className="muted">Loading charts…</div>;
  if (!symbols.length) return <div className="muted">No symbols available yet.</div>;

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
