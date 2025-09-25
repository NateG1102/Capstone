// shows recent rows from the quotes table (server → DB)
import { useEffect, useState } from 'react';
import { listQuotes } from '../services/stockAPI';

export default function QuotesTable() {
  const [rows, setRows] = useState([]);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await listQuotes(limit, offset);
      setRows(r.data?.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [limit, offset]);

  function next() { setOffset(offset + limit); }
  function prev() { setOffset(Math.max(0, offset - limit)); }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Market Quotes (DB)</h3>
      <div className="small muted" style={{ marginBottom: 8 }}>
        Served from your quotes table (latest first).
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Price</th>
              <th>Δ</th>
              <th>%</th>
              <th>Fetched</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol}>
                <td>{r.symbol}</td>
                <td>{r.price}</td>
                <td>{r.change}</td>
                <td>
                  {typeof r.change_percent === 'number'
                    ? `${r.change_percent}%`
                    : (r.change_percent ?? '—')}
                </td>
                <td>{new Date(r.fetched_at).toLocaleString()}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan="5" className="muted">No rows yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button onClick={prev} disabled={offset === 0}>Prev</button>
        <button onClick={next}>Next</button>
        <select value={limit} onChange={e => { setOffset(0); setLimit(Number(e.target.value)); }}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        {loading && <span className="small muted">loading…</span>}
      </div>
    </div>
  );
}
