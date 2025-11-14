import { useState, useEffect } from "react";
import { addToWishlist, removeFromWishlist, readWishlist } from "../utils/cookies";
import { Link, useNavigate } from "react-router-dom";
import { LOCAL_NAMES } from "../data/localNames";
import MiniChart from "../components/MiniChart";   // ⭐ NEW accurate chart component

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [selected, setSelected] = useState("");
  const ALL_STOCKS = Object.keys(LOCAL_NAMES);

  const navigate = useNavigate();

  useEffect(() => {
    setFavorites(readWishlist());
  }, []);

  function handleAdd() {
    if (!selected) return;
    const updated = addToWishlist(selected);
    setFavorites(updated);
  }

  return (
    <div className="container">

      {/* ⭐ Home Button */}
      <button
        className="segbtn"
        onClick={() => navigate("/")}
        style={{
          padding: "6px 14px",
          marginBottom: 16,
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        ← Home
      </button>

      <h1 className="big">Favorites</h1>

      {/* Dropdown Selector */}
      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3>Add a Stock to Favorites</h3>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">Select Stock</option>
          {ALL_STOCKS.map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol} — {LOCAL_NAMES[symbol]}
            </option>
          ))}
        </select>

        <button className="segbtn" onClick={handleAdd} style={{ marginLeft: 8 }}>
          Add
        </button>
      </div>

      {/* Favorites List */}
      <div className="card" style={{ marginTop: 16, padding: 16 }}>
        <h3>Your Favorites</h3>

        {!favorites.length ? (
          <div className="muted">No favorites yet.</div>
        ) : (
          favorites.map((sym) => (
            <div key={sym} style={{ marginBottom: 28 }}>

              {/* Symbol + Remove button */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Link to={`/stock/${sym}`} style={{ fontWeight: 700 }}>
                  {sym}
                </Link>

                <button
                  className="segbtn"
                  onClick={() => {
                    const updated = removeFromWishlist(sym);
                    setFavorites(updated);
                  }}
                >
                  Remove
                </button>
              </div>

              {/* ⭐ REAL Chart (using backend fetchHistory) */}
              <div style={{ marginTop: 8 }}>
                <MiniChart symbol={sym} />
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
