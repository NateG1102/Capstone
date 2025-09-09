import axios from 'axios';
const API = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8081';
export const fetchNews = (symbol) => axios.get(`${API}/api/news?symbol=${symbol}`);
