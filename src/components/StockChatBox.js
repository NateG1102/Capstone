import { useRef, useState, useEffect, useMemo } from 'react';
import { askChat } from '../services/chatAPI';

export default function StockChatBox({ symbol, rows = [] }) {
  const [messages, set] = useState([
    { role: 'assistant', content: `Ask me about ${symbol}. Educational only — not financial advice.` }
  ]);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef(null);
  const logRef = useRef(null);

  const context = useMemo(() => {
    if (!rows.length) return '';
    const last = rows.at(-1)?.close;
    const w = rows.slice(-7).map(r => r.close);
    const change = w.length > 1 ? ((w.at(-1) - w[0]) / w[0]) * 100 : 0;
    return `Latest close ≈ ${last}. ~1w change ≈ ${Number.isFinite(change) ? change.toFixed(2) : '0.00'}%.`;
  }, [rows]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  async function send() {
    const text = inputRef.current.value.trim();
    if (!text) return;
    inputRef.current.value = '';
    set(m => [...m, { role: 'user', content: text }]);
    setTyping(true);
    try {
      const r = await askChat(text, { symbol, context });
      const reply = r?.data?.content || 'No reply.';
      set(m => [...m, { role: 'assistant', content: reply }]);
    } catch {
      set(m => [...m, { role: 'assistant', content: 'Chat temporarily unavailable.' }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="stock-chatbox">
      <div className="stock-chatlog" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`stock-message ${m.role}`}>{m.content}</div>
        ))}
        {typing && <div className="stock-message assistant">…</div>}
      </div>
      <div className="stock-chatinput">
        <input
          ref={inputRef}
          placeholder={`Ask about ${symbol}…`}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
