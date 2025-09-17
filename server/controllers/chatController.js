
const axios = require('axios');

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

// POST /api/chat
// body: { message, symbol?, context? }
exports.chat = async (req, res) => {
  const { message = '', symbol = '', context = '' } = req.body || {};

  // no key → stub so the UI always gets a reply
  if (!OPENAI_KEY) {
  const summary = context ? `Context: ${context}.` : '';
  return res.json({
    role: 'assistant',
    content: `(${symbol || 'N/A'}) Got it. ${summary}`.trim()
  });
}

  try {
    // real model call goes here (kept simple for now)
    // const r = await axios.post('https://api.openai.com/v1/chat/completions', {...}, { headers:{ Authorization:`Bearer ${OPENAI_KEY}` }});
    // const content = r.data?.choices?.[0]?.message?.content || 'No content';
    const content = `(${symbol || 'N/A'}) ${message || 'OK'}. Context: ${context || 'n/a'}.`;

    return res.json({ role: 'assistant', content });
  } catch (err) {
    console.error('[chat]', err.message);
    return res.status(500).json({ role: 'assistant', content: 'Chat error.' });
  }
};
