// src/components/Header.jsx

import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import ThemeToggle from "./ThemToggle";

export default function Header() {
  return (
    <header
      className="site-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <img src={logo} alt="Stock Dash logo" style={{ height: 40, width: "auto" }} />

        {/* Site title */}
        <h1 className="site-title" style={{ margin: 0 }}>StockSyncer</h1>

        {/* ⭐ Favorites Button */}
        <Link
          to="/favorites"
          style={{
            marginLeft: 20,
            textDecoration: "none",
            fontWeight: 600,
            color: "var(--text)",
            fontSize: 18
          }}
        >
          Favorites
        </Link>
      </div>

      {/* Light/Dark theme toggle */}
      <div>
        <ThemeToggle compact />
      </div>
    </header>
  );
}
