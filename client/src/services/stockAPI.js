import axios from 'axios';

// use env when available; fallback to localhost:8081
// Prefer explicit env; otherwise use the current page's host so it works on LAN/other devices
const API =
  process.env.REACT_APP_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:8081`;

// canonical function names
export const fetchPrice = (symbol) => axios.get(`${API}/api/stocks/price/${symbol}`);
export const fetchHistory = (symbol) => axios.get(`${API}/api/stocks/history/${symbol}`);

// compatibility exports so existing imports keep working
export const getStockPrice = fetchPrice;
export const getHistoricalData = fetchHistory;

// list latest quotes from DB
export const listQuotes = (limit = 25, offset = 0) =>
  axios.get(`${API}/api/stocks/quotes`, { params: { limit, offset } });


// In src/services/stockAPI.js
export async function fetchProfile(symbol) {
  // adapt to your backend; return an object with a name field
  const res = await fetch(`/api/profile?symbol=${encodeURIComponent(symbol)}`);
  const data = await res.json();
  return { data }; // expected { data: { companyName / longName / shortName / name / company } }
}
