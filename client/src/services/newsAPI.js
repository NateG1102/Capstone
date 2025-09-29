// client/src/services/newsAPI.js
import axios from 'axios';
const API = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8081';

// Ask server for up to 10 items from the last 30 days for better hit rate
export const fetchNews = (symbol, limit = 10, days = 30) =>
  axios.get(`${API}/api/news/${symbol}`, { params: { limit, days } });
