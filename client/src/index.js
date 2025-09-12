import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';

const container = document.getElementById('root'); // <-- must match index.html
if (!container) {
  // helpful error instead of a blank page
  throw new Error('Mount container #root not found in public/index.html');
}

const root = ReactDOM.createRoot(container);
root.render(
  // You can keep StrictMode; comment it out while debugging if you want
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
