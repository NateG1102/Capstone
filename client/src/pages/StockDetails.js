// src/pages/StockDetails.js
// imported all files from section of code to allow the user to see the charts
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPrice, fetchHistory } from '../services/stockAPI';
import { fetchNews } from '../services/newsAPI';
import { fetchOwnership } from '../services/ownershipAPI';
import StockChatBox from '../components/StockChatBox';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

// --- Local fallback names (A–Z common listings). Extend anytime. ---, built in array to dictionary in a sense, gets key val pairs in the user being able to map company name to ticker symbol 
const LOCAL_NAMES = {
  // A
  A: 'Agilent Technologies', AA: 'Alcoa Corporation', AAC: 'Ares Acquisition', AAL: 'American Airlines Group',
  AAP: 'Advance Auto Parts', AAPL: 'Apple Inc.', ABB: 'ABB Ltd.', ABBV: 'AbbVie Inc.', ABC: 'AmerisourceBergen',
  ABNB: 'Airbnb, Inc.', ABT: 'Abbott Laboratories', ACN: 'Accenture plc', ADBE: 'Adobe Inc.', ADI: 'Analog Devices',
  ADM: 'Archer-Daniels-Midland', ADP: 'Automatic Data Processing', ADSK: 'Autodesk, Inc.',
  AEM: 'Agnico Eagle Mines', AEP: 'American Electric Power', AER: 'AerCap Holdings', AFL: 'Aflac Incorporated',
  AFRM: 'Affirm Holdings', AGNC: 'AGNC Investment', AIG: 'American International Group', AKAM: 'Akamai Technologies',
  ALB: 'Albemarle Corporation', ALL: 'The Allstate Corporation', ALLY: 'Ally Financial', ALNY: 'Alnylam Pharmaceuticals',
  AM: 'Antero Midstream', AMAT: 'Applied Materials', AMC: 'AMC Entertainment', AMD: 'Advanced Micro Devices',
  AME: 'AMETEK, Inc.', AMGN: 'Amgen Inc.', AMT: 'American Tower', AMZN: 'Amazon.com, Inc.',
  // B
  BA: 'The Boeing Company', BABA: 'Alibaba Group', BAC: 'Bank of America', BBY: 'Best Buy Co., Inc.',
  BDX: 'Becton, Dickinson and Company', BE: 'Bloom Energy', BEN: 'Franklin Resources', BIIB: 'Biogen Inc.',
  BK: 'Bank of New York Mellon', BKNG: 'Booking Holdings', BLK: 'BlackRock, Inc.', BMY: 'Bristol-Myers Squibb',
  // C
  C: 'Citigroup Inc.', CAH: 'Cardinal Health', CARR: 'Carrier Global', CAT: 'Caterpillar Inc.',
  CB: 'Chubb Limited', CBOE: 'Cboe Global Markets', CBRE: 'CBRE Group', CCL: 'Carnival Corporation',
  CDNS: 'Cadence Design Systems', CDW: 'CDW Corporation', CEG: 'Constellation Energy', CELH: 'Celsius Holdings',
  CF: 'CF Industries', CHWY: 'Chewy, Inc.', CI: 'The Cigna Group', CL: 'Colgate-Palmolive', CLF: 'Cleveland-Cliffs',
  CMCSA: 'Comcast Corporation', CME: 'CME Group', CMG: 'Chipotle Mexican Grill', COF: 'Capital One Financial',
  COIN: 'Coinbase Global', COP: 'ConocoPhillips', COST: 'Costco Wholesale', CRWD: 'CrowdStrike Holdings',
  CSCO: 'Cisco Systems', CSX: 'CSX Corporation',
  // D
  DAL: 'Delta Air Lines', DE: 'Deere & Company', DELL: 'Dell Technologies', DG: 'Dollar General',
  DHI: 'D.R. Horton', DHR: 'Danaher Corporation', DIS: 'The Walt Disney Company', DKNG: 'DraftKings Inc.',
  DLTR: 'Dollar Tree', DOCU: 'DocuSign', DOW: 'Dow Inc.', DPZ: "Domino's Pizza", DUK: 'Duke Energy',
  // E
  EA: 'Electronic Arts', EBAY: 'eBay Inc.', ECL: 'Ecolab Inc.', ED: 'Consolidated Edison',
  EL: 'Estée Lauder', ELV: 'Elevance Health', EMR: 'Emerson Electric', ENPH: 'Enphase Energy',
  EOG: 'EOG Resources', EQIX: 'Equinix, Inc.', EQT: 'EQT Corporation', ETN: 'Eaton Corporation',
  ETSY: 'Etsy, Inc.', EW: 'Edwards Lifesciences', EXC: 'Exelon Corporation',
  // F
  F: 'Ford Motor Company', FDX: 'FedEx Corporation', FI: 'Fiserv, Inc.', FSLR: 'First Solar', FTNT: 'Fortinet, Inc.',
  // G
  GE: 'General Electric', GEHC: 'GE HealthCare', GILD: 'Gilead Sciences', GIS: 'General Mills',
  GM: 'General Motors', GOOG: 'Alphabet Inc. (Class C)', GOOGL: 'Alphabet Inc. (Class A)', GS: 'Goldman Sachs',
  // H
  HD: 'The Home Depot', HON: 'Honeywell International', HPE: 'Hewlett Packard Enterprise',
  HPQ: 'HP Inc.', HUM: 'Humana Inc.',
  // I
  IBM: 'International Business Machines', ICE: 'Intercontinental Exchange', INTC: 'Intel Corporation',
  INTU: 'Intuit Inc.', ISRG: 'Intuitive Surgical',
  // J
  JNJ: 'Johnson & Johnson', JPM: 'JPMorgan Chase & Co.',
  // K
  KHC: 'Kraft Heinz', KO: 'Coca-Cola Company', KR: 'Kroger Co.',
  // L
  LIN: 'Linde plc', LLY: 'Eli Lilly and Company', LMT: 'Lockheed Martin', LOW: "Lowe's Companies",
  // M
  MA: 'Mastercard Incorporated', MCD: "McDonald's Corporation", MCO: "Moody's Corporation",
  MDLZ: 'Mondelez International', MDT: 'Medtronic plc', META: 'Meta Platforms', MMM: '3M Company',
  MO: 'Altria Group', MRK: 'Merck & Co.', MRNA: 'Moderna, Inc.', MS: 'Morgan Stanley',
  MSFT: 'Microsoft Corporation', MU: 'Micron Technology',
  // N
  NFLX: 'Netflix, Inc.', NKE: 'NIKE, Inc.', NOC: 'Northrop Grumman', NOW: 'ServiceNow',
  NVDA: 'NVIDIA Corporation',
  // O
  OKTA: 'Okta, Inc.', ON: 'ON Semiconductor', ORCL: 'Oracle Corporation', ORLY: "O'Reilly Automotive",
  OXY: 'Occidental Petroleum',
  // P
  PANW: 'Palo Alto Networks', PEP: 'PepsiCo, Inc.', PFE: 'Pfizer Inc.', PG: 'Procter & Gamble',
  PLTR: 'Palantir Technologies', PM: 'Philip Morris International', PNC: 'PNC Financial Services',
  PSX: 'Phillips 66', PYPL: 'PayPal Holdings',
  // Q
  QCOM: 'Qualcomm Incorporated', QRVO: 'Qorvo, Inc.',
  // R
  REGN: 'Regeneron Pharmaceuticals', RIVN: 'Rivian Automotive', ROK: 'Rockwell Automation',
  ROKU: 'Roku, Inc.', ROP: 'Roper Technologies', RTX: 'RTX Corporation',
  // S
  SBUX: 'Starbucks Corporation', SHOP: 'Shopify Inc.', SMCI: 'Super Micro Computer',
  SNAP: 'Snap Inc.', SNOW: 'Snowflake Inc.', SO: 'Southern Company', SOFI: 'SoFi Technologies',
  SPGI: 'S&P Global', SPOT: 'Spotify Technology', SQ: 'Block, Inc. (Square)', STX: 'Seagate Technology',
  SYK: 'Stryker Corporation',
  // T
  T: 'AT&T Inc.', TEAM: 'Atlassian', TEL: 'TE Connectivity', TGT: 'Target Corporation',
  TJX: 'TJX Companies', TMO: 'Thermo Fisher Scientific', TMUS: 'T-Mobile US',
  TSLA: 'Tesla, Inc.', TSM: 'Taiwan Semiconductor', TXN: 'Texas Instruments',
  // U
  UBER: 'Uber Technologies', UNH: 'UnitedHealth Group', UNP: 'Union Pacific', UPS: 'United Parcel Service',
  // V
  V: 'Visa Inc.', VLO: 'Valero Energy', VRSK: 'Verisk Analytics', VRSN: 'VeriSign, Inc.',
  VRTX: 'Vertex Pharmaceuticals', VZ: 'Verizon Communications',
  // W
  WBD: 'Warner Bros. Discovery', WDAY: 'Workday, Inc.', WFC: 'Wells Fargo', WM: 'Waste Management',
  WMT: 'Walmart Inc.',
  // X
  XOM: 'Exxon Mobil',
  // Y
  YUM: 'Yum! Brands',
  // Z
  ZM: 'Zoom Video Communications', ZS: 'Zscaler, Inc.'
};
{/* Reads the ticker symbol from routes and in a sense gets buckets of states and the api responds */}
export default function StockDetails() {
  const { symbol: routeSymbol } = useParams();
  const symbol = (routeSymbol || 'AAPL').toUpperCase();
{/* Loading, tracks whethere page is getting data
   price, holds the latest quote object, rows holds the historical price rows, news holds the articles and ownership shows the institutions that partake in the ownership of stock, then u have ur settersn*/}

  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(null);
  const [rows, setRows] = useState([]);
  const [news, setNews] = useState([]);
  const [ownership, setOwnership] = useState([]);

  // Company name (works even when APIs omit it)
  const [company, setCompany] = useState('');
  const displayName = company || symbol;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Reset on symbol change (prevents stale/publisher names)
    setCompany('');

    (async () => {
      const [p, h, n, o] = await Promise.allSettled([
        fetchPrice(symbol),
        fetchHistory(symbol),
        fetchNews(symbol, 8, 30),
        fetchOwnership(symbol),
      ]);

      if (!isMounted) return;

      // price, displays price towards user
      if (p.status === 'fulfilled') setPrice(p.value?.data || null);
      else setPrice(null);

      // history
      if (h.status === 'fulfilled') {
        const hr = h.value?.data?.rows ?? h.value?.data ?? [];
        setRows(Array.isArray(hr) ? hr : []);
      } else {
        setRows([]);
      }

      // news, pulls from the api, details news from places like Benzinga
      if (n.status === 'fulfilled') {
        const items = Array.isArray(n.value?.data?.items) ? n.value.data.items : [];
        setNews(items);
      } else {
        setNews([]);
      }

      // ownership (table only)
      if (o.status === 'fulfilled') {
        const holders = Array.isArray(o.value?.data?.holders) ? o.value.data.holders : [];
        setOwnership(holders);
      } else {
        setOwnership([]);
      }

      // ---------- Company name resolution ----------
      let nameGuess = '';

      // 1) Prefer fields from price payload
      if (p.status === 'fulfilled') {
        const pv = p.value?.data;
        nameGuess =
          pv?.companyName ||
          pv?.longName ||
          pv?.shortName ||
          pv?.name ||
          pv?.company ||
          '';
      }

      // 2) Or history metadata
      if (!nameGuess && h.status === 'fulfilled') {
        const hv = h.value?.data;
        const meta = hv?.meta || hv?.Meta || null;
        if (meta) {
          nameGuess =
            meta.company ||
            meta.longName ||
            meta.shortName ||
            meta.name ||
            '';
        }
      }

      // 3) Final fallback: local symbol map (covers A–Z common names incl. DKNG)
      if (!nameGuess) nameGuess = LOCAL_NAMES[symbol] || '';

      if (isMounted) {
        setCompany(nameGuess);
        setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [symbol]);

  // === Chart: range buttons (1W / 1M / 6M / 1Y) ===
  const [range, setRange] = useState('1m'); // '1w' | '1m' | '6m' | '1y'

  const rangedRows = useMemo(() => {
    if (!rows?.length) return [];
    const days =
      range === '1w' ? 7 :
      range === '1m' ? 30 :
      range === '6m' ? 182 : 365;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

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
            <div
              className="big"
              style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}
            >
              {/* Displays Company name */}
              <span className="muted" style={{ fontWeight: 600 }}>
                {displayName}
              </span>

              {/* Shows is price and the chance of price */}
              <span>${Number(price.price).toFixed(2)}</span>
              {price.change != null && (
                <span style={{ color: (Number(price.change) >= 0 ? 'var(--success)' : 'var(--danger)') }}>
                  {Number(price.change).toFixed(2)} ({price.changePercent})
                </span>
              )}
            </div>
          )}

          {loading && <span className="muted small">loading…</span>}
        </div>
      </div>

      {/* Shows the chart + news */}
      <div className="grid">
        {/* Allows user to control the duration that is pressed and see price trend */}
        <div className="card">
          <div className="big" style={{ marginBottom: 8 }}>Price Trend</div>

          {/* Duration */}
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
