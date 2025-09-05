import axios from 'axios';
const API = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8081';
export const fetchPrice = (symbol) => axios.get(`${API}/api/stocks/price/${symbol}`);
export const fetchHistory = (symbol) => axios.get(`${API}/api/stocks/history/${symbol}`);
