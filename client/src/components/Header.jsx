// src/components/Header.jsx

// importing the logo from assets
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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src={logo} alt="Stock Dash logo" style={{ height: 40, width: "auto" }} />
        <h1 className="site-title" style={{ margin: 0 }}>StockSyncer</h1>
      </div>

      {/* Light/Dark theme toggle */}
      <div>
        <ThemeToggle compact />
      </div>
    </header>
  );
}
