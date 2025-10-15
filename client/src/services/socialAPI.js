// client/src/services/socialAPI.js
import axios from 'axios';
const API =
  process.env.REACT_APP_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:8081`;

export const fetchSocial = (symbol, limit = 20) =>
  axios.get(`${API}/api/social/${symbol}`, { params: { limit } });
