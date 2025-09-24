// server/controllers/chatController.js
const OpenAI = require('openai');

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const client = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

// POST /api/chat
// body: { message, symbol?, context? }
exports.chat = async (req, res) => {
  const { message = '', symbol = '', context = '' } = req.body || {};

  // no key → keep the app usable with a simple stub
  if (!client) {
    return res.json({
      role: 'assistant',
      content: `(${symbol || 'N/A'}) ${message || 'No question.'} Context: ${context || 'n/a'}.`
    });
  }

  try {
    // system prompt keeps answers short and non-advisory
    const system = [
      `You are an educational markets helper.`,
      `Ticker: ${symbol || 'N/A'}.`,
      context ? `Context: ${context}.` : '',
      `Answer in 1–2 sentences. No financial advice.`
    ].filter(Boolean).join(' ');

    // Chat Completions API 
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message || 'Brief overview.' }
      ],
      temperature: 0.3
    }); // Docs: Chat API. :contentReference[oaicite:1]{index=1}

    const content = resp?.choices?.[0]?.message?.content?.trim() || 'No content.';
    return res.json({ role: 'assistant', content });
  } catch (err) {
    console.error('[chat]', err?.response?.status, err?.message);
    // graceful fallback so UI never shows "No response"
    return res.json({
      role: 'assistant',
      content: `(${symbol || 'N/A'}) Chat service had an issue. Context: ${context || 'n/a'}.`
    });
  }
};
