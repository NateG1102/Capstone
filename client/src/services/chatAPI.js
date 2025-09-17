
import axios from 'axios';

const API = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8081';

// POST /api/chat { message, symbol, context }
export function askChat(message, { symbol = '', context = '' } = {}) {
  return axios.post(`${API}/api/chat`, { message, symbol, context });
}
