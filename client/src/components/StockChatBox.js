import { useRef, useState, useEffect } from 'react';
import { askChat } from '../services/chatAPI';

export default function StockChatBox({ symbol, rows = [] }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Ask me about ${symbol}. Educational only — not financial advice.` }
  ]);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  async function send() {
    const text = inputRef.current.value.trim();
    if (!text) return;
    inputRef.current.value = '';
    setMessages(m => [...m, { role: 'user', content: text }]);
    setTyping(true);

    try {
      const r = await askChat(text, { symbol });
      const reply = r?.data?.content || 'No reply.';
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Chat temporarily unavailable.' }]);
    } finally {
      setTyping(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') send();
  }

  return (
    <div className="stock-chatbox">
      <div className="stock-chatlog" ref={logRef}>
        {messages.map((m, i) => (
          <div key={i} className={`stock-message ${m.role}`}>
            {m.content}
          </div>
        ))}
        {typing && <div className="stock-message assistant">...</div>}
      </div>

      <div className="stock-chatinput">
        <input
          ref={inputRef}
          placeholder={`Ask about ${symbol}...`}
          onKeyDown={onKeyDown}
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
