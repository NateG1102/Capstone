import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

/** Inline ticker list (A–Z, trimmed). Add more anytime. */
const TICKERS = [
  // A
  { symbol: "A",    name: "Agilent Technologies (placeholder)" },
  { symbol: "AA",   name: "Alcoa Corporation" },
  { symbol: "AAC",  name: "Ares Acquisition" },
  { symbol: "AAL",  name: "American Airlines Group" },
  { symbol: "AAP",  name: "Advance Auto Parts" },
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "ABB",  name: "ABB Ltd." },
  { symbol: "ABBV", name: "AbbVie Inc." },
  { symbol: "ABNB", name: "Airbnb, Inc." },
  { symbol: "ABT",  name: "Abbott Laboratories" },
  { symbol: "ACN",  name: "Accenture plc" },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "ADI",  name: "Analog Devices" },
  { symbol: "ADM",  name: "Archer-Daniels-Midland" },
  { symbol: "ADP",  name: "Automatic Data Processing" },
  { symbol: "ADSK", name: "Autodesk, Inc." },
  { symbol: "AEM",  name: "Agnico Eagle Mines" },
  { symbol: "AEP",  name: "American Electric Power" },
  { symbol: "AER",  name: "AerCap Holdings" },
  { symbol: "AFL",  name: "Aflac Incorporated" },
  { symbol: "AFRM", name: "Affirm Holdings" },
  { symbol: "AGNC", name: "AGNC Investment" },
  { symbol: "AIG",  name: "American International Group" },
  { symbol: "AKAM", name: "Akamai Technologies" },
  { symbol: "ALB",  name: "Albemarle Corporation" },
  { symbol: "ALL",  name: "The Allstate Corporation" },
  { symbol: "ALLY", name: "Ally Financial" },
  { symbol: "ALNY", name: "Alnylam Pharmaceuticals" },
  { symbol: "AMAT", name: "Applied Materials" },
  { symbol: "AMC",  name: "AMC Entertainment" },
  { symbol: "AMD",  name: "Advanced Micro Devices" },
  { symbol: "AME",  name: "AMETEK, Inc." },
  { symbol: "AMGN", name: "Amgen Inc." },
  { symbol: "AMT",  name: "American Tower" },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  // B
  { symbol: "BA",   name: "The Boeing Company" },
  { symbol: "BABA", name: "Alibaba Group" },
  { symbol: "BAC",  name: "Bank of America" },
  { symbol: "BBY",  name: "Best Buy Co., Inc." },
  { symbol: "BDX",  name: "Becton, Dickinson and Company" },
  { symbol: "BE",   name: "Bloom Energy" },
  { symbol: "BEN",  name: "Franklin Resources" },
  { symbol: "BIIB", name: "Biogen Inc." },
  { symbol: "BK",   name: "The Bank of New York Mellon" },
  { symbol: "BKNG", name: "Booking Holdings" },
  { symbol: "BLK",  name: "BlackRock, Inc." },
  { symbol: "BMY",  name: "Bristol-Myers Squibb" },
  // C
  { symbol: "C",    name: "Citigroup Inc." },
  { symbol: "CAH",  name: "Cardinal Health" },
  { symbol: "CARR", name: "Carrier Global" },
  { symbol: "CAT",  name: "Caterpillar Inc." },
  { symbol: "CB",   name: "Chubb Limited" },
  { symbol: "CBOE", name: "Cboe Global Markets" },
  { symbol: "CBRE", name: "CBRE Group" },
  { symbol: "CCL",  name: "Carnival Corporation" },
  { symbol: "CDNS", name: "Cadence Design Systems" },
  { symbol: "CDW",  name: "CDW Corporation" },
  { symbol: "CEG",  name: "Constellation Energy" },
  { symbol: "CELH", name: "Celsius Holdings" },
  { symbol: "CF",   name: "CF Industries" },
  { symbol: "CHWY", name: "Chewy, Inc." },
  { symbol: "CI",   name: "The Cigna Group" },
  { symbol: "CL",   name: "Colgate-Palmolive" },
  { symbol: "CLF",  name: "Cleveland-Cliffs" },
  { symbol: "CMCSA",name: "Comcast Corporation" },
  { symbol: "CME",  name: "CME Group" },
  { symbol: "CMG",  name: "Chipotle Mexican Grill" },
  { symbol: "COF",  name: "Capital One Financial" },
  { symbol: "COIN", name: "Coinbase Global" },
  { symbol: "COP",  name: "ConocoPhillips" },
  { symbol: "COST", name: "Costco Wholesale" },
  { symbol: "CRWD", name: "CrowdStrike Holdings" },
  { symbol: "CSCO", name: "Cisco Systems" },
  { symbol: "CSX",  name: "CSX Corporation" },
  // D
  { symbol: "DAL",  name: "Delta Air Lines" },
  { symbol: "DE",   name: "Deere & Company" },
  { symbol: "DELL", name: "Dell Technologies" },
  { symbol: "DG",   name: "Dollar General" },
  { symbol: "DHI",  name: "D.R. Horton" },
  { symbol: "DHR",  name: "Danaher Corporation" },
  { symbol: "DIS",  name: "The Walt Disney Company" },
  { symbol: "DKNG", name: "DraftKings" },
  { symbol: "DLTR", name: "Dollar Tree" },
  { symbol: "DOCU", name: "DocuSign" },
  { symbol: "DOW",  name: "Dow Inc." },
  { symbol: "DPZ",  name: "Domino's Pizza" },
  { symbol: "DUK",  name: "Duke Energy" },
  // E
  { symbol: "EA",   name: "Electronic Arts" },
  { symbol: "EBAY", name: "eBay Inc." },
  { symbol: "ECL",  name: "Ecolab Inc." },
  { symbol: "ED",   name: "Consolidated Edison" },
  { symbol: "EL",   name: "Estée Lauder" },
  { symbol: "ELV",  name: "Elevance Health" },
  { symbol: "EMR",  name: "Emerson Electric" },
  { symbol: "ENPH", name: "Enphase Energy" },
  { symbol: "EOG",  name: "EOG Resources" },
  { symbol: "EQIX", name: "Equinix, Inc." },
  { symbol: "EQT",  name: "EQT Corporation" },
  { symbol: "ETN",  name: "Eaton Corporation" },
  { symbol: "ETSY", name: "Etsy, Inc." },
  { symbol: "EW",   name: "Edwards Lifesciences" },
  { symbol: "EXC",  name: "Exelon Corporation" },
  // F
  { symbol: "F",    name: "Ford Motor Company" },
  { symbol: "FDX",  name: "FedEx Corporation" },
  { symbol: "FI",   name: "Fiserv, Inc." },
  { symbol: "FSLR", name: "First Solar" },
  { symbol: "FTNT", name: "Fortinet, Inc." },
  // G
  { symbol: "GE",   name: "General Electric" },
  { symbol: "GEHC", name: "GE HealthCare" },
  { symbol: "GILD", name: "Gilead Sciences" },
  { symbol: "GIS",  name: "General Mills" },
  { symbol: "GM",   name: "General Motors" },
  { symbol: "GOOG", name: "Alphabet Inc. (Class C)" },
  { symbol: "GOOGL",name: "Alphabet Inc. (Class A)" },
  { symbol: "GS",   name: "Goldman Sachs" },
  // H
  { symbol: "HD",   name: "The Home Depot" },
  { symbol: "HON",  name: "Honeywell International" },
  { symbol: "HPE",  name: "Hewlett Packard Enterprise" },
  { symbol: "HPQ",  name: "HP Inc." },
  { symbol: "HUM",  name: "Humana Inc." },
  // I
  { symbol: "IBM",  name: "International Business Machines" },
  { symbol: "ICE",  name: "Intercontinental Exchange" },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "INTU", name: "Intuit Inc." },
  { symbol: "ISRG", name: "Intuitive Surgical" },
  // J
  { symbol: "JNJ",  name: "Johnson & Johnson" },
  { symbol: "JPM",  name: "JPMorgan Chase & Co." },
  // K
  { symbol: "KHC",  name: "Kraft Heinz" },
  { symbol: "KO",   name: "Coca-Cola Company" },
  { symbol: "KR",   name: "Kroger Co." },
  // L
  { symbol: "LIN",  name: "Linde plc" },
  { symbol: "LLY",  name: "Eli Lilly and Company" },
  { symbol: "LMT",  name: "Lockheed Martin" },
  { symbol: "LOW",  name: "Lowe's Companies" },
  // M
  { symbol: "MA",   name: "Mastercard Incorporated" },
  { symbol: "MCD",  name: "McDonald's Corporation" },
  { symbol: "MCO",  name: "Moody's Corporation" },
  { symbol: "MDLZ", name: "Mondelez International" },
  { symbol: "MDT",  name: "Medtronic plc" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "MMM",  name: "3M Company" },
  { symbol: "MO",   name: "Altria Group" },
  { symbol: "MRK",  name: "Merck & Co." },
  { symbol: "MRNA", name: "Moderna, Inc." },
  { symbol: "MS",   name: "Morgan Stanley" },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "MU",   name: "Micron Technology" },
  // N
  { symbol: "NFLX", name: "Netflix, Inc." },
  { symbol: "NKE",  name: "NIKE, Inc." },
  { symbol: "NOC",  name: "Northrop Grumman" },
  { symbol: "NOW",  name: "ServiceNow" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  // O
  { symbol: "OKTA", name: "Okta, Inc." },
  { symbol: "ON",   name: "ON Semiconductor" },
  { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "ORLY", name: "O'Reilly Automotive" },
  { symbol: "OXY",  name: "Occidental Petroleum" },
  // P
  { symbol: "PANW", name: "Palo Alto Networks" },
  { symbol: "PEP",  name: "PepsiCo, Inc." },
  { symbol: "PFE",  name: "Pfizer Inc." },
  { symbol: "PG",   name: "Procter & Gamble" },
  { symbol: "PLTR", name: "Palantir Technologies" },
  { symbol: "PM",   name: "Philip Morris International" },
  { symbol: "PNC",  name: "PNC Financial Services" },
  { symbol: "PSX",  name: "Phillips 66" },
  { symbol: "PYPL", name: "PayPal Holdings" },
  // Q
  { symbol: "QCOM", name: "Qualcomm Incorporated" },
  { symbol: "QRVO", name: "Qorvo, Inc." },
  // R
  { symbol: "REGN", name: "Regeneron Pharmaceuticals" },
  { symbol: "RIVN", name: "Rivian Automotive" },
  { symbol: "ROK",  name: "Rockwell Automation" },
  { symbol: "ROKU", name: "Roku, Inc." },
  { symbol: "ROP",  name: "Roper Technologies" },
  { symbol: "RTX",  name: "RTX Corporation" },
  // S
  { symbol: "SBUX", name: "Starbucks Corporation" },
  { symbol: "SHOP", name: "Shopify Inc." },
  { symbol: "SMCI", name: "Super Micro Computer" },
  { symbol: "SNAP", name: "Snap Inc." },
  { symbol: "SNOW", name: "Snowflake Inc." },
  { symbol: "SO",   name: "Southern Company" },
  { symbol: "SOFI", name: "SoFi Technologies" },
  { symbol: "SPGI", name: "S&P Global" },
  { symbol: "SPOT", name: "Spotify Technology" },
  { symbol: "SQ",   name: "Block, Inc. (Square)" },
  { symbol: "STX",  name: "Seagate Technology" },
  { symbol: "SYK",  name: "Stryker Corporation" },
  // T
  { symbol: "T",    name: "AT&T Inc." },
  { symbol: "TEAM", name: "Atlassian" },
  { symbol: "TEL",  name: "TE Connectivity" },
  { symbol: "TGT",  name: "Target Corporation" },
  { symbol: "TJX",  name: "TJX Companies" },
  { symbol: "TMO",  name: "Thermo Fisher Scientific" },
  { symbol: "TMUS", name: "T-Mobile US" },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "TSM",  name: "Taiwan Semiconductor" },
  { symbol: "TXN",  name: "Texas Instruments" },
  // U
  { symbol: "UBER", name: "Uber Technologies" },
  { symbol: "UNH",  name: "UnitedHealth Group" },
  { symbol: "UNP",  name: "Union Pacific" },
  { symbol: "UPS",  name: "United Parcel Service" },
  // V
  { symbol: "V",    name: "Visa Inc." },
  { symbol: "VLO",  name: "Valero Energy" },
  { symbol: "VRSK", name: "Verisk Analytics" },
  { symbol: "VRSN", name: "VeriSign, Inc." },
  { symbol: "VRTX", name: "Vertex Pharmaceuticals" },
  { symbol: "VZ",   name: "Verizon Communications" },
  // W
  { symbol: "WBD",  name: "Warner Bros. Discovery" },
  { symbol: "WDAY", name: "Workday, Inc." },
  { symbol: "WFC",  name: "Wells Fargo" },
  { symbol: "WM",   name: "Waste Management" },
  { symbol: "WMT",  name: "Walmart Inc." },
  // X
  { symbol: "XOM",  name: "Exxon Mobil" },
  // Y
  { symbol: "YUM",  name: "Yum! Brands" },
  // Z
  { symbol: "ZM",   name: "Zoom Video Communications" },
  { symbol: "ZS",   name: "Zscaler, Inc." }
];

export default function SearchBar() {
  const [val, setVal] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0, width: 0 });
  const nav = useNavigate();
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const normalize = (s) => (s || '').trim().toUpperCase().replace(/\s+/g, '');
  const sanitize  = (s) => (normalize(s).match(/[A-Z0-9.-]+/)?.[0] ?? '');

  // Filter by symbol prefix OR company name prefix (case-insensitive)
  const suggestions = useMemo(() => {
    const qRaw = (val || '').trim();
    if (!qRaw) return [];
    const qSym = normalize(qRaw);
    const qName = qRaw.toLowerCase();
    return TICKERS.filter(t =>
      t.symbol.startsWith(qSym) || t.name.toLowerCase().startsWith(qName)
    ).slice(0, 200);
  }, [val]);

  function go(raw) {
    const sym = sanitize(typeof raw === 'string' ? raw : raw?.symbol ?? val);
    if (sym) {
      setOpen(false);
      nav(`/stock/${sym}`);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    if (open && suggestions.length) {
      go(suggestions[Math.max(0, Math.min(highlight, suggestions.length - 1))]);
    } else {
      go(val);
    }
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(suggestions.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(0, h - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
    // Enter handled by onSubmit
  }

  // close menu on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // portal positioning
  useEffect(() => {
    function updateMenuPos() {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuPos({ left: Math.round(r.left), top: Math.round(r.bottom), width: Math.round(r.width) });
    }
    if (open) {
      updateMenuPos();
      window.addEventListener('resize', updateMenuPos);
      window.addEventListener('scroll', updateMenuPos, true);
      return () => {
        window.removeEventListener('resize', updateMenuPos);
        window.removeEventListener('scroll', updateMenuPos, true);
      };
    }
  }, [open, val]);

  const disabled = sanitize(val) === '';

  // Currently highlighted item (for left info panel)
  const current = suggestions.length ? suggestions[Math.max(0, Math.min(highlight, suggestions.length - 1))] : null;

  // The dropdown rendered into a portal: two-column layout
  const menu = open && suggestions.length > 0 ? createPortal(
    <div
      style={{
        position: 'fixed',
        left: menuPos.left,
        top: menuPos.top + 6,
        width: Math.max(menuPos.width, 420),
        zIndex: 9999,
        maxHeight: 420,
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(0,0,0,.22)',
        background: 'var(--bg2, #000)',
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 40%) 1fr',
      }}
      role="dialog"
      aria-label="Symbol suggestions"
    >
      {/* Left preview/name panel */}
      <div
        style={{
          padding: 12,
          borderRight: '1px solid var(--border)',
          background: 'var(--card)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: 160
        }}
      >
        {current ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>
              {current.name}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 14 }}>
              Ticker: <span style={{ fontWeight: 600 }}>{current.symbol}</span>
            </div>
          </>
        ) : (
          <div className="muted">Start typing a symbol or company…</div>
        )}
      </div>

      {/* Right list */}
      <div
        role="listbox"
        aria-label="Symbols"
        style={{
          maxHeight: 420,
          overflowY: 'auto'
        }}
      >
        {suggestions.map((t, i) => (
          <div
            key={t.symbol}
            role="option"
            aria-selected={i === highlight}
            onMouseEnter={() => setHighlight(i)}
            onMouseDown={(e) => { e.preventDefault(); go(t); }}
            style={{
              padding: '10px 12px',
              cursor: 'pointer',
              background: i === highlight ? 'var(--card)' : 'transparent',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700, width: 64 }}>{t.symbol}</span>
              <span className="muted small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                {t.name}
              </span>
            </div>
            <span className="muted small">Go ↵</span>
          </div>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <form
        onSubmit={onSubmit}
        ref={boxRef}
        className="card"
        role="search"
        aria-label="Search ticker"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 8,
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <input
          ref={inputRef}
          className="input"
          value={val}
          onChange={e => { setVal(e.target.value); setOpen(true); setHighlight(0); }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          placeholder="Type a symbol or company (e.g., AAPL or Apple)"
          style={{ width: '100%' }}
          inputMode="latin"
          autoComplete="off"
          spellCheck={false}
          aria-label="Ticker symbol"
        />

        <button
          type="submit"
          disabled={disabled}
          aria-disabled={disabled}
          aria-label="Search"
          style={{
            padding: '10px 16px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--accent)',
            color: 'white',
            fontWeight: 600,
            boxShadow: '0 6px 14px rgba(0,0,0,.15)',
            transition: 'transform .08s ease'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          Search
        </button>
      </form>

      {menu}
    </>
  );
}
