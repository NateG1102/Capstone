import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [val, setVal] = useState('');
  const nav = useNavigate();

  function go() {
    const sym = val.trim().toUpperCase();
    if (sym) nav(`/stock/${sym}`);
  }

  return (
    <div className="card" style={{ display:'flex', gap:8, alignItems:'center' }}>
      <input
        className="input"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => (e.key === 'Enter') && go()}
        placeholder="Type a symbol (e.g., AAPL) and press Enter"
        style={{ flex:1 }}
      />
      <button onClick={go}>Search</button>
    </div>
  );
}
