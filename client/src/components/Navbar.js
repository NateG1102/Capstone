// client/src/components/Navbar.js
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
      }}
    >
      <Link
        to="/"
        className="big"
        style={{ textDecoration: 'none', color: 'var(--text)' }}
      >
        StockSyncer
      </Link>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
        <Link to="/stock/AAPL">AAPL</Link>
        <Link to="/stock/MSFT">MSFT</Link>
        <Link to="/stock/NVDA">NVDA</Link>
      </div>
    </nav>
  );
}
