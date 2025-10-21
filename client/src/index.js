import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';

/* --- Apply saved theme (or OS preference) before mounting --- */
(() => {
  try {
    const saved = (localStorage.getItem('theme') || '').toLowerCase();
    let useLight;

    if (saved === 'light' || saved === 'dark') {
      useLight = saved === 'light';
    } else {
      // First visit: respect OS preference
      useLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      localStorage.setItem('theme', useLight ? 'light' : 'dark');
    }

    // Toggle class on <body> to trigger your CSS variables in global.css
    document.body.classList.toggle('light', useLight);
  } catch {
    // If anything goes wrong, default to dark (no 'light' class)
    document.body.classList.remove('light');
  }
})();
/* ------------------------------------------------------------ */

const container = document.getElementById('root'); // <-- must match index.html
if (!container) {
  // helpful error instead of a blank page
  throw new Error('Mount container #root not found in public/index.html');
}

const root = ReactDOM.createRoot(container);
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
