// src/pages/TrendlinePage.js
import React, { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { fetchHistory } from "../services/stockAPI";

// Timeframe → number of days
const DAYS_BY_TIMEFRAME = {
  "1W": 7,
  "1M": 30,
  "6M": 180,
  "1Y": 365,
};

export default function TrendlinePage() {
  const { symbol: routeSymbol } = useParams();
  const navigate = useNavigate();

  const initialSymbol = (routeSymbol || "AAPL").toUpperCase();

  const chartRef = useRef(null);
  const overlayRef = useRef(null);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState("");

  const [allRows, setAllRows] = useState([]); 
  const [rows, setRows] = useState([]);       

  const [timeframe, setTimeframe] = useState("1M");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);

  function applyTimeframe(list, tf) {
    if (!Array.isArray(list) || list.length === 0) return [];
    const days = DAYS_BY_TIMEFRAME[tf] || 30;
    if (list.length <= days) return list;
    return list.slice(-days);
  }

  async function loadHistory(sym) {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetchHistory(sym);
      const data = res.data;
      const hr = data?.rows ?? [];

      if (!Array.isArray(hr) || hr.length === 0) {
        setAllRows([]);
        setRows([]);
        setErrorMsg("No chart data found for this ticker.");
      } else {
        setAllRows(hr);
        setRows(applyTimeframe(hr, timeframe));
      }
    } catch (err) {
      console.error("Trendline error:", err);
      setErrorMsg("Failed to load historical data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allRows.length) {
      setRows(applyTimeframe(allRows, timeframe));
    }
  }, [timeframe, allRows]);

  useEffect(() => {
    loadHistory(initialSymbol);
  }, [initialSymbol]);

  const chartData =
    rows.length > 0
      ? {
          labels: rows.map((r) => r.date),
          datasets: [
            {
              label: `${symbol} Price`,
              data: rows.map((r) => r.close),
              borderColor: "rgba(75,192,192,1)",
              tension: 0.3,
              pointRadius: 0,
            },
          ],
        }
      : null;

  useEffect(() => {
    if (!overlayRef.current) return;
    const canvas = overlayRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (startPoint && endPoint) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }, [startPoint, endPoint]);

  const handleMouseDown = (e) => {
    const rect = overlayRef.current.getBoundingClientRect();
    setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setEndPoint(null);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = overlayRef.current.getBoundingClientRect();
    setEndPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    const sym = searchInput.trim().toUpperCase();
    setSymbol(sym);
    loadHistory(sym);
  };

  return (
    <div className="container" style={{ padding: 24 }}>

      {/* ⭐ HOME BUTTON */}
      <button
        className="segbtn"
        onClick={() => navigate("/")}
        style={{
          padding: "6px 14px",
          marginBottom: 16,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        ← Home
      </button>

      <h1 className="text-3xl font-bold mb-6">Trendline Tool for {symbol}</h1>

      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        style={{ display: "flex", gap: 12, marginBottom: 20 }}
      >
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter ticker (ex: TSLA)"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text)",
            flex: 1,
          }}
        />

        <button
          type="submit"
          style={{
            padding: "10px 20px",
            background: "var(--grad1)",
            borderRadius: 8,
            color: "white",
            fontWeight: "bold",
            border: "none",
          }}
        >
          Load Chart
        </button>
      </form>

      {/* Timeframe Selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8, fontWeight: 600 }}>Timeframe:</label>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          style={{ padding: 8, borderRadius: 6 }}
        >
          <option value="1W">1 Week</option>
          <option value="1M">1 Month</option>
          <option value="6M">6 Months</option>
          <option value="1Y">1 Year</option>
        </select>
      </div>

      {errorMsg && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            padding: 12,
            borderColor: "hsla(0,70%,60%,0.4)",
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading && <div className="muted">Loading chart…</div>}

      {!loading && chartData && (
        <div style={{ position: "relative", height: 400 }}>
          <Line ref={chartRef} data={chartData} />

          {/* Drawing overlay */}
          <canvas
            ref={overlayRef}
            width={800}
            height={400}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              cursor: "crosshair",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
      )}
    </div>
  );
}
