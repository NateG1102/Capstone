
import { useState } from 'react';
import { askChat } from '../services/chatAPI';

export default function StockChatBox({ symbol, context }) {
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);

  async function send() {
    const content = text.trim();
    if (!content) return;

    // add user msg
    setMsgs((m) => [...m, { role: 'user', content }]);
    setText('');

    try {
      const res = await askChat(content, { symbol, context });
      const reply = res?.data?.content || 'No reply.';
      setMsgs((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('chat', err);
      setMsgs((m) => [...m, { role: 'assistant', content: 'Chat error.' }]);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') send();
  }

  return (
    <div className="stock-chatbox">
      {/* header */}
      <h3 style={{ marginTop: 0 }}>Ask about {symbol}</h3>

      {/* messages */}
      <div className="stock-chatlog">
        {msgs.map((m, i) => (
          <div key={i} className={`stock-message ${m.role}`}>{m.content}</div>
        ))}
      </div>

      {/* input */}
      <div className="stock-chatinput">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Ask about ${symbol || 'this stock'}…`}
        />
        <button type="button" onClick={send}>Send</button>
      </div>

      {/* note */}
      <div className="small muted" style={{ marginTop: 8 }}>
        Educational only — not financial advice.
      </div>
    </div>
  );
}
