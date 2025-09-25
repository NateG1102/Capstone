import SearchBar from '../components/SearchBar';
import RandomCharts from '../components/RandomCharts';

export default function Home() {
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

        {/* Logo slot (replace with your SVG/image later) */}
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

      {/* Random relevant charts */}
      <div style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 8px' }}>Trending symbols</h3>
        <RandomCharts count={6} />
      </div>
    </div>
  );
}
