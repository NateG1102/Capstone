import axios from 'axios';

// use env when available; fallback to localhost:8081
const API = process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8081';

// canonical function names
export const fetchPrice = (symbol) => axios.get(`${API}/api/stocks/price/${symbol}`);
export const fetchHistory = (symbol) => axios.get(`${API}/api/stocks/history/${symbol}`);

// compatibility exports so existing imports keep working
export const getStockPrice = fetchPrice;
export const getHistoricalData = fetchHistory;
