// server/controllers/chatController.js
const OpenAI = require('openai');

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const client = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

// quick topic check (no external calls)
// we allow if msg mentions the ticker, or any common trading/finance terms
function isOnTopic(msg, symbol) {
  const m = String(msg || '').toLowerCase();
  if (!m.trim()) return false;

  // ticker mention helps anchor to the current company
  const sym = String(symbol || '').toLowerCase();
  if (sym && m.includes(sym)) return true;

  // basic finance/trading vocabulary (lightweight heuristic)
  const terms = [
    'stock', 'share', 'price', 'chart', 'volume', 'market cap', 'pe', 'p/e',
    'earnings', 'revenue', 'guidance', 'dividend', 'split', 'ipo',
    'support', 'resistance', 'trend', 'moving average', 'rsi', 'macd',
    'news', 'sec', 'filing', '10-k', '10q', '10-q', '8-k', '13f', 'institutional',
    'analyst', 'upgrade', 'downgrade', 'forecast', 'prediction', 'ownership',
    'buy', 'sell', 'hold', 'long', 'short'
  ];
  return terms.some(t => m.includes(t));
}

// POST /api/chat
// body: { message, symbol?, context? }
exports.chat = async (req, res) => {
  const { message = '', symbol = '', context = '' } = req.body || {};

  // off-topic fast path (keeps frontend simple)
  if (!isOnTopic(message, symbol)) {
    const s = symbol || 'this stock';
    return res.json({
      role: 'assistant',
      content:
        `Please keep questions about ${s} and related trading/company info ` +
        `(e.g., price moves, earnings, news, charts, or ownership).`
    });
  }

  // no key → keep app usable with a simple stub
  if (!client) {
    // short educational stub; stays on-topic because of the guard above
    return res.json({
      role: 'assistant',
      content: `(${symbol || 'N/A'}) ${message || 'No question.'} ${context ? `Context: ${context}.` : ''}`
    });
  }

  try {
    // keep it grounded + short + non-advisory; refuse off-topic
    const system = [
      `You are an educational markets helper for the ticker ${symbol || 'N/A'}.`,
      context ? `Context: ${context}.` : '',
      `Only answer questions about the current stock, its company, or trading details.`,
      `If the user asks anything unrelated, politely remind them to ask about this stock only.`,
      `Keep answers to 1–2 sentences.`
    ].filter(Boolean).join(' ');

    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message }
      ],
      temperature: Number(process.env.CHAT_TEMP || 0.3)
    });

    const content = resp?.choices?.[0]?.message?.content?.trim() || 'No content.';
    return res.json({ role: 'assistant', content });
  } catch (err) {
    // log so you can see real reason in server console
    console.error('[chat]', err.status || '', err.message || '');
    if (err.response?.data) console.error('[chat:data]', err.response.data);
    // graceful fallback, still on-topic reminder handled by guard above
    return res.json({
      role: 'assistant',
      content:
        `(${symbol || 'N/A'}) Chat service had an issue. ` +
        `${context ? `Context: ${context}.` : ''}`
    });
  }
};
