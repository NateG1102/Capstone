// server/controllers/chatController.js
// simple guardrails + chat; keeps answers about the current stock only

const OpenAI = require('openai');

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TEMP = Number(process.env.CHAT_TEMP || 0.3);
const client = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

/* ---------- on-topic terms (expanded a bit) ---------- */
const TERMS_FUNDAMENTAL = [
  'fundamental','valuation','intrinsic value','revenue','sales','net income','profit','earnings','eps',
  'operating income','gross margin','operating margin','net margin','ebit','ebitda','free cash flow','fcf',
  'cash flow','capex','guidance','outlook','consensus','estimate','beat','miss','pe','p/e','peg','ps','p/s',
  'pb','p/b','dividend','yield','payout ratio','buyback','repurchase','shares outstanding','float','dilution',
  'secondary offering','book value','return on equity','roe','roa','roic','wacc','discount rate','dps','split',
  'reverse split'
];

const TERMS_TECHNICAL = [
  'technical','trend','momentum','breakout','breakdown','support','resistance','moving average','sma','ema',
  'vwap','macd','rsi','stochastic','bollinger bands','atr','ichimoku','fib','fibonacci','pivot','gap',
  'volume profile','accumulation','distribution','overbought','oversold','bearish','bullish','golden cross',
  'death cross','divergence','candlestick','doji','hammer','engulfing','pin bar'
];

const TERMS_EVENTS = [
  'earnings','earnings call','premarket','after hours','upgrade','downgrade','price target','merger',
  'acquisition','m&a','spin-off','ipo','lockup','layoffs','restructuring','partnership','product launch',
  'inflation','rates','fed','interest rate','tariff','regulation','antitrust','probe','investigation',
  'supply chain','backlog'
];

const TERMS_FILINGS = [
  'sec','filing','10-k','10q','10-q','8-k','s-1','s-3','s-4','prospectus','424b5','def 14a','proxy','13f',
  'sc 13d','13g','form 4','insider buying','insider selling'
];

const TERMS_MARKET = [
  'price','quote','bid','ask','spread','market cap','short interest','days to cover','sector','industry',
  'index','etf','volatility','beta','implied volatility','iv','liquidity','slippage','market breadth'
];

const TERMS_ORDERS = [
  'order','limit order','market order','stop','stop loss','take profit','trailing stop','oco','gtc','good for day',
  'fill or kill'
];

const TERMS_RISK = [
  'risk','drawdown','exposure','position sizing','hedge','hedging','variance','standard deviation',
  'sharpe','sortino','alpha','correlation'
];

const TERMS_PORTFOLIO = [
  'portfolio','allocation','rebalance','diversification','overweight','underweight','long','short','pair trade',
  'leverage','margin','margin call'
];

const TERMS_OPTIONS = [
  'option','calls','puts','strike','expiry','greeks','delta','gamma','theta','vega','rho','covered call',
  'cash-secured put','iron condor','credit spread','debit spread'
];

const TERMS_NEWS_SENTIMENT = [
  'news','headline','press release','pr','sentiment','bullish','bearish','neutral','catalyst'
];

// NEW: general company questions (so “what’s the name of this company?” is allowed)
const TERMS_GENERAL = [
  'company','business','ticker','stock','profile','overview','about the company','what does it do',
  'products','services','brand','mission','ceo','founder','leadership','management','headquarters','hq',
  'founded','history','sector','industry','name','full name'
];

/* flatten and prebuild a word set */
const ONTOPIC = new Set([
  ...TERMS_FUNDAMENTAL,
  ...TERMS_TECHNICAL,
  ...TERMS_EVENTS,
  ...TERMS_FILINGS,
  ...TERMS_MARKET,
  ...TERMS_ORDERS,
  ...TERMS_RISK,
  ...TERMS_PORTFOLIO,
  ...TERMS_OPTIONS,
  ...TERMS_NEWS_SENTIMENT,
  ...TERMS_GENERAL
].map(s => s.toLowerCase()));

/* quick patterns like "rsi 70", "ema 50", etc. */
const EXTRA_PATTERNS = [
  /\brsi\s*\d{1,3}\b/i,
  /\bmacd\b/i,
  /\bp\/?e\b/i,
  /\bema\s*\d+\b/i,
  /\bsma\s*\d+\b/i,
  /\b(beta|iv|atr)\b/i,
  /\bprice\s*target\b/i,
  /\bshort\s*interest\b/i,
  /\bdividend\s*(yield|rate)?\b/i
];

/* main gate — a little looser if we already have a ticker in context */
function isOnTopic(message, symbol) {
  const m = String(message || '').toLowerCase().trim();
  if (!m) return false;

  const sym = String(symbol || '').toLowerCase();

  // if user mentions the ticker explicitly, allow
  if (sym && new RegExp(`(?:^|\\b)${sym}(?:\\b|$)`, 'i').test(m)) return true;

  // whole-word finance/company terms
  const escaped = Array.from(ONTOPIC).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length) {
    const rx = new RegExp(`(?:^|\\b)(?:${escaped.join('|')})(?:\\b|$)`, 'i');
    if (rx.test(m)) return true;
  }

  // metric patterns
  if (EXTRA_PATTERNS.some(rx => rx.test(m))) return true;

  // gentle fallback: if a symbol is in context and user asks a short “what/who/how” about “this/it/company” → allow
  if (sym) {
    const hasPronoun = /\b(this|it|company|stock)\b/i.test(m);
    const hasQ = /\b(what|who|where|when|how|why)\b/i.test(m);
    if (hasPronoun && hasQ && m.length <= 80) return true;
  }

  return false;
}

/* ---------- main handler ---------- */
// POST /api/chat  body: { message, symbol?, context? }
exports.chat = async (req, res) => {
  const { message = '', symbol = '', context = '' } = req.body || {};

  // off-topic → short nudge
  if (!isOnTopic(message, symbol)) {
    const s = symbol || 'this stock';
    return res.json({
      role: 'assistant',
      content: `Please keep questions about ${s} and related trading/company info (e.g., price moves, earnings, filings, charts, or ownership).`
    });
  }

  // no key → keep the app usable (simple echo w/ context)
  if (!client) {
    return res.json({
      role: 'assistant',
      content: `(${symbol || 'N/A'}) ${message || 'No question.'}${context ? `  Context: ${context}.` : ''}`
    });
  }

  try {
    // keep it grounded and short; refuse off-topic
    const system = [
      `You help with questions about ticker ${symbol || 'N/A'}.`,
      context ? `Context: ${context}.` : '',
      `Only answer about this stock, its company, or trading details.`,
      `If the user asks anything unrelated, remind them to stick to this stock.`,
      `Keep answers to 1–2 sentences. No financial advice.`
    ].filter(Boolean).join(' ');

    const resp = await client.chat.completions.create({
      model: MODEL,
      temperature: TEMP,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message }
      ]
    });

    const content = resp?.choices?.[0]?.message?.content?.trim() || 'No content.';
    return res.json({ role: 'assistant', content });
  } catch (err) {
    // log the real reason server-side for debugging
    console.error('[chat]', err?.response?.status || '', err?.message || err);
    if (err?.response?.data) console.error('[chat:data]', err.response.data);

    // graceful fallback (still stays on-topic due to gate above)
    return res.json({
      role: 'assistant',
      content: `(${symbol || 'N/A'}) Chat service had an issue.${context ? `  Context: ${context}.` : ''}`
    });
  }
};
