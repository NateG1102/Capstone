const OPENAI_KEY = process.env.OPENAI_API_KEY;

// POST /api/chat  { message, symbol?, context? }
exports.postChat = async (req, res) => {
  try {
    const { message, symbol, context } = req.body || {};
    const userMsg = String(message || '').trim();
    const ticker = (symbol || '').toUpperCase();

    const systemPrompt =
      `You are a helpful stock education assistant. Do not provide financial advice.
       Keep answers short and clear. ${ticker ? `Ticker: ${ticker}.` : ''} ${context ? `Context: ${context}` : ''}`;

    if (!OPENAI_KEY) {
      return res.json({
        role: 'assistant',
        content: `Stub reply for ${ticker || 'N/A'} — you said: "${userMsg}". (Set OPENAI_API_KEY to enable real answers.)`
      });
    }

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5',
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg }
        ],
        temperature: 0.3
      })
    });
    const data = await r.json();
    const text =
      data?.output_text ||
      data?.content?.[0]?.text ||
      data?.choices?.[0]?.message?.content ||
      'No response';
    res.json({ role: 'assistant', content: text });
  } catch (e) {
    res.json({ role: 'assistant', content: 'Chat temporarily unavailable.' });
  }
};
