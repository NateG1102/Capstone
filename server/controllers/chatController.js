// server/controllers/chatController.js
// keep answers about the current stock; log each turn to chat_log

const OpenAI = require('openai');
const pool = require('../db/pool');

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const TEMP = Number(process.env.CHAT_TEMP || 0.3);
const client = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

function extractHorizonDays(message) {
  const m = String(message || '').toLowerCase();

  // explicit "in X days"
  let match = m.match(/(\d+)\s*day/);
  if (match) return Math.min(parseInt(match[1], 10), 90);

  // "X weeks" → 5 trading days per week
  match = m.match(/(\d+)\s*week/);
  if (match) return Math.min(parseInt(match[1], 10) * 5, 90);

  // "X months" → ~21 trading days per month
  match = m.match(/(\d+)\s*month/);
  if (match) return Math.min(parseInt(match[1], 10) * 21, 90);

  // vague short-term
  if (/\b(next|coming)\s+(few\s+)?(days|week)\b/.test(m)) return 5;

  return null;
}

// quick db logger
async function logChat(symbol, role, content) {
  const sym = symbol ? String(symbol).toUpperCase() : null;
  const txt = String(content || '').slice(0, 8000); // safety cap
  try {
    await pool.query(
      `insert into chat_logs(symbol, role, content) values ($1,$2,$3)`,
      [sym, role, txt]
    );
  } catch (e) {
    // don’t break chat if logging fails
    console.warn('[chat:log]', e.message);
  }
}

/* ---------- on-topic terms ---------- */
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
// general company stuff (so “what’s the name of this company?” works)
const TERMS_GENERAL = [
  'company','business','ticker','stock','profile','overview','about the company','what does it do',
  'products','services','brand','mission','ceo','founder','leadership','management','headquarters','hq',
  'founded','history','sector','industry','name','full name'
];

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

function isOnTopic(message, symbol) {
  const m = String(message || '').toLowerCase().trim();
  if (!m) return false;

  const sym = String(symbol || '').toLowerCase();

  // allow ultra-short follow-ups like "how much?" / "how many?" once a ticker is set
  if (sym && /\bhow\s+much\b/i.test(m)) return true;
  if (sym && /\bhow\s+many\b/i.test(m)) return true;

  // if the actual ticker is mentioned, always treat as on-topic
  if (sym && new RegExp(`(?:^|\\b)${sym}(?:\\b|$)`, 'i').test(m)) return true;
    
  // allow prediction / forecast questions when a symbol is set
  if (sym && /\b(predict|prediction|predictions?|forecast|projection|projected)\b/i.test(m)) {
    return true;
  }




  const escaped = Array.from(ONTOPIC).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length) {
    const rx = new RegExp(`(?:^|\\b)(?:${escaped.join('|')})(?:\\b|$)`, 'i');
    if (rx.test(m)) return true;
  }

  if (EXTRA_PATTERNS.some(rx => rx.test(m))) return true;

  if (sym) {
    const hasPronoun = /\b(this|it|company|stock)\b/i.test(m);
    const hasQ = /\b(what|who|where|when|how|why)\b/i.test(m);
    if (hasPronoun && hasQ && m.length <= 80) return true;
  }

  return false;
}


/* main handler */
// POST /api/chat  body: { message, symbol?, context? }
exports.chat = async (req, res) => {
  const { message = '', symbol = '', context = '' } = req.body || {};
  const sym = (symbol || '').toUpperCase();

  // log user message
  if (message) await logChat(sym, 'user', message);

  // off-topic → short nudge (also log)
  if (!isOnTopic(message, sym)) {
    const s = sym || 'this stock';
    const content = `Please keep questions about ${s} and related trading/company info (e.g., price moves, earnings, filings, charts, or ownership).`;
    await logChat(sym, 'assistant', content);
    return res.json({ role: 'assistant', content });
  }

    // try to pull in a horizon-specific projection to enrich context
  const horizon = extractHorizonDays(message) || 5;
  let predExtra = '';

  try {
    const url = `${process.env.API_BASE || 'http://127.0.0.1:8081'}/api/stocks/predict/${sym}?horizon=${horizon}`;
    const p = await fetch(url).then(r => r.json());

    if (p && p.projectedPrice) {
      predExtra =
        `Trend: ${p.trend || 'n/a'} | ` +
        `${horizon}-day projection: $${p.projectedPrice} | ` +
        `r²=${p.r2}`;
    }
  } catch (e) {
    console.warn('[chat:pred]', e.message);
  }

  const mergedContext = [context, predExtra].filter(Boolean).join(' • ');


  // no key → keep usable (echo + context), still log
  if (!client) {
    const content =
      `(${sym || 'N/A'}) ${message || 'No question.'}` +
      (mergedContext ? `  Context: ${mergedContext}.` : '');
    await logChat(sym, 'assistant', content);
    return res.json({ role: 'assistant', content });
  }


  try {
    const system = [
      `You help with questions about ticker ${sym || 'N/A'}.`,
      mergedContext ? `Context: ${mergedContext}.` : '',
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
    await logChat(sym, 'assistant', content);
    return res.json({ role: 'assistant', content });
  } catch (err) {
    console.error('[chat:raw]', err);     // add this
    console.error('[chat]', err?.response?.status || '', err?.message || err);
    if (err?.response?.data) console.error('[chat:data]', err.response.data);

    const content = `(${sym || 'N/A'}) Chat service had an issue.${context ? `  Context: ${context}.` : ''}`;
    await logChat(sym, 'assistant', content);
    return res.json({ role: 'assistant', content });
  }
};
