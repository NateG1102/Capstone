// src/pages/StockDetails.js
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPrice, fetchHistory } from '../services/stockAPI';
import { fetchNews } from '../services/newsAPI';
import { fetchOwnership } from '../services/ownershipAPI';
import { fetchPrediction } from '../services/stockAPI';
import StockChatBox from '../components/StockChatBox';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { fetchSocial } from '../services/socialAPI';
import { addToWishlist } from '../utils/cookies'; // <-- wishlist cookie helper

// Local fallback names (A–Z common listings)
const LOCAL_NAMES = {
  A: 'Agilent Technologies', AA: 'Alcoa Corporation', AAC: 'Ares Acquisition', AAL: 'American Airlines Group',
  AAP: 'Advance Auto Parts', AAPL: 'Apple Inc.', ABB: 'ABB Ltd.', ABBV: 'AbbVie Inc.', ABC: 'AmerisourceBergen',
  ABNB: 'Airbnb, Inc.', ABT: 'Abbott Laboratories', ACN: 'Accenture plc', ADBE: 'Adobe Inc.', ADI: 'Analog Devices',
  ADM: 'Archer-Daniels-Midland', ADP: 'Automatic Data Processing', ADSK: 'Autodesk, Inc.',
  AEM: 'Agnico Eagle Mines', AEP: 'American Electric Power', AER: 'AerCap Holdings', AFL: 'Aflac Incorporated',
  AFRM: 'Affirm Holdings', AGNC: 'AGNC Investment', AIG: 'American International Group', AKAM: 'Akamai Technologies',
  ALB: 'Albemarle Corporation', ALL: 'The Allstate Corporation', ALLY: 'Ally Financial', ALNY: 'Alnylam Pharmaceuticals',
  AM: 'Antero Midstream', AMAT: 'Applied Materials', AMC: 'AMC Entertainment', AMD: 'Advanced Micro Devices',
  AME: 'AMETEK, Inc.', AMGN: 'Amgen Inc.', AMT: 'American Tower', AMZN: 'Amazon.com, Inc.',
  BA: 'The Boeing Company', BABA: 'Alibaba Group', BAC: 'Bank of America', BBY: 'Best Buy Co., Inc.',
  BDX: 'Becton, Dickinson and Company', BE: 'Bloom Energy', BEN: 'Franklin Resources', BIIB: 'Biogen Inc.',
  BK: 'Bank of New York Mellon', BKNG: 'Booking Holdings', BLK: 'BlackRock, Inc.', BMY: 'Bristol-Myers Squibb',
  C: 'Citigroup Inc.', CAH: 'Cardinal Health', CARR: 'Carrier Global', CAT: 'Caterpillar Inc.',
  CB: 'Chubb Limited', CBOE: 'Cboe Global Markets', CBRE: 'CBRE Group', CCL: 'Carnival Corporation',
  CDNS: 'Cadence Design Systems', CDW: 'CDW Corporation', CEG: 'Constellation Energy', CELH: 'Celsius Holdings',
  CF: 'CF Industries', CHWY: 'Chewy, Inc.', CI: 'The Cigna Group', CL: 'Colgate-Palmolive', CLF: 'Cleveland-Cliffs',
  CMCSA: 'Comcast Corporation', CME: 'CME Group', CMG: 'Chipotle Mexican Grill', COF: 'Capital One Financial',
  COIN: 'Coinbase Global', COP: 'ConocoPhillips', COST: 'Costco Wholesale', CRWD: 'CrowdStrike Holdings',
  CSCO: 'Cisco Systems', CSX: 'CSX Corporation',
  DAL: 'Delta Air Lines', DE: 'Deere & Company', DELL: 'Dell Technologies', DG: 'Dollar General',
  DHI: 'D.R. Horton', DHR: 'Danaher Corporation', DIS: 'The Walt Disney Company', DKNG: 'DraftKings Inc.',
  DLTR: 'Dollar Tree', DOCU: 'DocuSign', DOW: 'Dow Inc.', DPZ: "Domino's Pizza", DUK: 'Duke Energy',
  EA: 'Electronic Arts', EBAY: 'eBay Inc.', ECL: 'Ecolab Inc.', ED: 'Consolidated Edison',
  EL: 'Estée Lauder', ELV: 'Elevance Health', EMR: 'Emerson Electric', ENPH: 'Enphase Energy',
  EOG: 'EOG Resources', EQIX: 'Equinix, Inc.', EQT: 'EQT Corporation', ETN: 'Eaton Corporation',
  ETSY: 'Etsy, Inc.', EW: 'Edwards Lifesciences', EXC: 'Exelon Corporation',
  F: 'Ford Motor Company', FDX: 'FedEx Corporation', FI: 'Fiserv, Inc.', FSLR: 'First Solar', FTNT: 'Fortinet, Inc.',
  GE: 'General Electric', GEHC: 'GE HealthCare', GILD: 'Gilead Sciences', GIS: 'General Mills',
  GM: 'General Motors', GOOG: 'Alphabet Inc. (Class C)', GOOGL: 'Alphabet Inc. (Class A)', GS: 'Goldman Sachs',
  HD: 'The Home Depot', HON: 'Honeywell International', HPE: 'Hewlett Packard Enterprise',
  HPQ: 'HP Inc.', HUM: 'Humana Inc.',
  IBM: 'International Business Machines', ICE: 'Intercontinental Exchange', INTC: 'Intel Corporation',
  INTU: 'Intuit Inc.', ISRG: 'Intuitive Surgical',
  JNJ: 'Johnson & Johnson', JPM: 'JPMorgan Chase & Co.',
  KHC: 'Kraft Heinz', KO: 'Coca-Cola Company', KR: 'Kroger Co.',
  LIN: 'Linde plc', LLY: 'Eli Lilly and Company', LMT: 'Lockheed Martin', LOW: "Lowe's Companies",
  MA: 'Mastercard Incorporated', MCD: "McDonald's Corporation", MCO: "Moody's Corporation",
  MDLZ: 'Mondelez International', MDT: 'Medtronic plc', META: 'Meta Platforms', MMM: '3M Company',
  MO: 'Altria Group', MRK: 'Merck & Co.', MRNA: 'Moderna, Inc.', MS: 'Morgan Stanley',
  MSFT: 'Microsoft Corporation', MU: 'Micron Technology',
  NFLX: 'Netflix, Inc.', NKE: 'NIKE, Inc.', NOC: 'Northrop Grumman', NOW: 'ServiceNow',
  NVDA: 'NVIDIA Corporation',
  OKTA: 'Okta, Inc.', ON: 'ON Semiconductor', ORCL: 'Oracle Corporation', ORLY: "O'Reilly Automotive",
  OXY: 'Occidental Petroleum',
  PANW: 'Palo Alto Networks', PEP: 'PepsiCo, Inc.', PFE: 'Pfizer Inc.', PG: 'Procter & Gamble',
  PLTR: 'Palantir Technologies', PM: 'Philip Morris International', PNC: 'PNC Financial Services',
  PSX: 'Phillips 66', PYPL: 'PayPal Holdings',
  QCOM: 'Qualcomm Incorporated', QRVO: 'Qorvo, Inc.',
  REGN: 'Regeneron Pharmaceuticals', RIVN: 'Rivian Automotive', ROK: 'Rockwell Automation',
  ROKU: 'Roku, Inc.', ROP: 'Roper Technologies', RTX: 'RTX Corporation',
  SBUX: 'Starbucks Corporation', SHOP: 'Shopify Inc.', SMCI: 'Super Micro Computer',
  SNAP: 'Snap Inc.', SNOW: 'Snowflake Inc.', SO: 'Southern Company', SOFI: 'SoFi Technologies',
  SPGI: 'S&P Global', SPOT: 'Spotify Technology', SQ: 'Block, Inc. (Square)', STX: 'Seagate Technology',
  SYK: 'Stryker Corporation',
  T: 'AT&T Inc.', TEAM: 'Atlassian', TEL: 'TE Connectivity', TGT: 'Target Corporation',
  TJX: 'TJX Companies', TMO: 'Thermo Fisher Scientific', TMUS: 'T-Mobile US',
  TSLA: 'Tesla, Inc.', TSM: 'Taiwan Semiconductor', TXN: 'Texas Instruments',
  UBER: 'Uber Technologies', UNH: 'UnitedHealth Group', UNP: 'Union Pacific', UPS: 'United Parcel Service',
  V: 'Visa Inc.', VLO: 'Valero Energy', VRSK: 'Verisk Analytics', VRSN: 'VeriSign, Inc.',
  VRTX: 'Vertex Pharmaceuticals', VZ: 'Verizon Communications',
  WBD: 'Warner Bros. Discovery', WDAY: 'Workday, Inc.', WFC: 'Wells Fargo', WM: 'Waste Management',
  WMT: 'Walmart Inc.',
  XOM: 'Exxon Mobil',
  YUM: 'Yum! Brands',
  ZM: 'Zoom Video Communications', ZS: 'Zscaler, Inc.'
};

export default function StockDetails() {
  const { symbol: routeSymbol } = useParams();
  const navigate = useNavigate();
  const symbol = (routeSymbol || 'AAPL').toUpperCase();

  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(null);
  const [rows, setRows] = useState([]);
  const [news, setNews] = useState([]);
  const [ownership, setOwnership] = useState([]);
  const [social, setSocial] = useState([]);
  const [pred, setPred] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [predError, setPredError] = useState('');
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8081';

  const [company, setCompany] = useState('');
  const displayName = company || symbol;

  // tiny note to confirm wishlist saves
  const [savedNote, setSavedNote] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    setCompany('');
    setPred(null);
    setPredError('');
    setPredLoading(false);

    (async () => {
      const [p, h, n, o, s] = await Promise.allSettled([
        fetchPrice(symbol),
        fetchHistory(symbol),
        fetchNews(symbol, 8, 30),
        fetchOwnership(symbol),
        fetchSocial(symbol, 10),
      ]);

      if (!isMounted) return;

      if (p.status === 'fulfilled') setPrice(p.value?.data || null);
      else setPrice(null);

      if (h.status === 'fulfilled') {
        const hr = h.value?.data?.rows ?? h.value?.data ?? [];
        setRows(Array.isArray(hr) ? hr : []);
      } else {
        setRows([]);
      }

      if (n.status === 'fulfilled') {
        const items = Array.isArray(n.value?.data?.items) ? n.value.data.items : [];
        setNews(items);
      } else {
        setNews([]);
      }

      if (o.status === 'fulfilled') {
        const holders = Array.isArray(o.value?.data?.holders) ? o.value.data.holders : [];
        setOwnership(holders);
      } else {
        setOwnership([]);
      }

      if (s.status === 'fulfilled') {
        const items = Array.isArray(s.value?.data?.items) ? s.value.data.items : [];
        setSocial(items);
      } else {
        setSocial([]);
      }

      // Resolve company name from payloads or local map
      let nameGuess = '';
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
      if (!nameGuess) nameGuess = LOCAL_NAMES[symbol] || '';

      if (isMounted) {
        setCompany(nameGuess);
        setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [symbol]);

  // === Chart range ===
  const [range, setRange] = useState('1m');
  const rangedRows = useMemo(() => {
    if (!rows?.length) return [];
    const days = range === '1w' ? 7 : range === '1m' ? 30 : range === '6m' ? 182 : 365;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const within = rows.filter(r => (r.date instanceof Date ? r.date : new Date(r.date)) >= cutoff);
    const data = (within.length ? within : rows).map(r => {
      const d = r.date instanceof Date ? r.date : new Date(r.date);
      return { ...r, iso: d.toISOString() };
    });
    return data;
  }, [rows, range]);

  const fmtX = (iso) => {
    const d = new Date(iso);
    if (range === '1w' || range === '1m') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  };
  const fmtY = v => `$${v}`;
  const tooltipValue = v => [`$${Number(v).toFixed(2)}`, 'Close'];
  const tooltipLabel = label => new Date(label).toLocaleString(undefined, { dateStyle: 'medium' });

  // prediction helper func
  async function runPrediction() {
    setPredLoading(true);
    setPredError('');
    try {
      const { data } = await axios.get(`${API_BASE}/api/stocks/predict/${symbol}`, { timeout: 10000 });
      setPred(data);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Unknown error';
      setPred(null);
      setPredError(`Could not run quick trend check: ${msg}`);
    } finally {
      setPredLoading(false);
    }
  }

  // save to wishlist cookie
  function handleAddWishlist() {
    addToWishlist(symbol);
    setSavedNote('Added!');
    setTimeout(() => setSavedNote(''), 1200);
  }

  // Twitter cashtag embed panel (kept functionality; UI-contained)
  function TwitterPanel({ symbol, apiBase }) {
    const [html, setHtml] = useState("");

    useEffect(() => {
      let cancelled = false;
      (async () => {
        try {
          const r = await fetch(`${apiBase}/api/social/twitter/${symbol}`);
          const j = await r.json();
          if (!cancelled) setHtml(j.html || "");
        } catch (e) {
          console.warn("[twitter] embed load failed:", e?.message || e);
        }
      })();
      return () => { cancelled = true; };
    }, [symbol, apiBase]);

    return (
      <div
        className="twitter-embed"
        style={{ width: "100%", minHeight: 320 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const RangeBtn = ({ value, children }) => (
    <button
      onClick={() => setRange(value)}
      aria-pressed={range === value}
      className={`segbtn ${range === value ? 'active' : ''}`}
      style={{ padding: '8px 12px' }}
    >
      {children}
    </button>
  );

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12, flexWrap:'wrap' }}>
          <button
            onClick={() => navigate('/')}
            className="segbtn"
            aria-label="Go to Home"
            title="Home"
          >
            Home
          </button>

          <button
            onClick={handleAddWishlist}
            className="segbtn"
            aria-label="Add to Wishlist"
            title="Add to Wishlist"
          >
            + Wishlist
          </button>
          {savedNote && <span className="small muted">{savedNote}</span>}

          <h2 style={{ margin: 0 }}>{symbol}</h2>

          {price?.price != null && (
            <div
              className="big"
              style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}
            >
              <span className="muted" style={{ fontWeight: 600 }}>
                {displayName}
              </span>
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

      {/* Chart + Prediction */}
      <div className="grid">
        <div className="card">
          <div className="big" style={{ marginBottom: 8 }}>Price Trend</div>
          <div className="seg" style={{ marginBottom: 10 }}>
            <span className="muted" style={{ alignSelf: 'center' }}>Duration:</span>
            <RangeBtn value="1w">1W</RangeBtn>
            <RangeBtn value="1m">1M</RangeBtn>
            <RangeBtn value="6m">6M</RangeBtn>
            <RangeBtn value="1y">1Y</RangeBtn>
          </div>
          <div style={{ height: 320 }}>
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
          <div className="small muted">Showing {rangedRows.length} points — {range.toUpperCase()} view.</div>
        </div>

        <div className="card">
          <div className="big" style={{ marginBottom: 8 }}>Prediction</div>
          <button onClick={runPrediction} disabled={predLoading} className="segbtn" style={{ marginBottom: 10 }}>
            {predLoading ? 'Checking…' : 'Run quick trend check'}
          </button>
          {predError && <div className="small muted">{predError}</div>}
          {pred && (
            <ul className="list scroll" style={{ marginTop: 8 }}>
              <li><strong>Trend:</strong> {pred.trend} <span className="small muted">(R² {pred.r2})</span></li>
              <li><strong>Days used:</strong> {pred.daysUsed}</li>
              <li><strong>Last close:</strong> ${pred.lastClose}</li>
              <li><strong>Projected (≈5 days):</strong> ${pred.projectedPrice}</li>
            </ul>
          )}
        </div>

        {/* News (clickable even when coming from DB) */}
        <div className="card">
          <div className="big" style={{ marginBottom: 8 }}>News</div>
          {!news.length ? (
            <div className="muted">No news yet.</div>
          ) : (
            <ul className="list scroll">
              {news.slice(0,10).map((a, i) => {
                const href = a.link || a.url || '#'; // <-- fix for DB records
                return (
                  <li key={i}>
                    <a href={href} target="_blank" rel="noreferrer">{a.title || href}</a>
                    {a.source && <span className="small muted"> — {a.source}</span>}
                    {a.publishedAt && <div className="small muted">{new Date(a.publishedAt).toLocaleString()}</div>}
                    {typeof a.sentimentScore === 'number' && a.sentimentLabel ? (
                      <div className="small muted">
                        {a.sentimentLabel} ({a.sentimentScore.toFixed(2)})
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Social Mentions */}
      <div className="card">
        <div className="big" style={{ marginBottom: 8 }}>Social Mentions</div>

        {/* Reddit links (kept exactly as-is) */}
        {!social.length ? (
          <div className="muted">No recent posts found.</div>
        ) : (
          <ul className="list scroll">
            {social.slice(0, 10).map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  [{s.source}] {s.text.length > 120 ? s.text.slice(0, 120) + "…" : s.text}
                </a>
                <div className="small muted">
                  {s.author}{s.subreddit ? ` • r/${s.subreddit}` : ""}{s.publishedAt ? ` • ${new Date(s.publishedAt).toLocaleString()}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Twitter cashtag timeline (replaces Stocktwits) */}
        <div className="divider" style={{ margin: "12px 0" }} />
        <div className="big" style={{ marginBottom: 6 }}>Twitter Cashtag Feed</div>
        <TwitterPanel symbol={symbol} apiBase={API_BASE} />
      </div>

      {/* Ownership + Chat */}
      <div className="grid">
        <div className="card">
          <div className="big" style={{ marginBottom: 8 }}>Institutional Ownership</div>
          {!ownership.length ? (
            <div className="muted">No ownership data.</div>
          ) : (
            <div className="scroll">
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
            </div>
          )}
          <div className="small muted" style={{ marginTop: 6 }}>
            Based on recent 13F filings (aggregated from local DB).
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
