import logo from "../assets/logo.png";

export default function Header() {
  return (
    <header className="site-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <img src={logo} alt="Stock Dash logo" style={{ height: 40, width: "auto" }} />
      <h1 className="site-title" style={{ margin: 0 }}>StockSyncer</h1>
    </header>
  );
}
