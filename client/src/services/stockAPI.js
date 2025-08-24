import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/stocks';

export const getStockPrice = (symbol) => axios.get(`${API_BASE}/price/${symbol}`);
export const getHistoricalData = (symbol) => axios.get(`${API_BASE}/history/${symbol}`);
