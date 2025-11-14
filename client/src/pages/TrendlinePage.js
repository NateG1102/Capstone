// src/pages/TrendlinePage.js
import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { fetchHistory } from "../services/stockAPI";

export default function TrendlinePage() {
  const { symbol: routeSymbol } = useParams();
  const initialSymbol = (routeSymbol || "AAPL").toUpperCase();

  const chartRef = useRef(null);
  const overlayRef = useRef(null);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState("");
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);

  // Load history using the same parsing style as StockDetails
  const loadHistory = async (sym) => {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetchHistory(sym);
      const data = res.data;
      const hr = data?.rows ?? data ?? [];

      if (!Array.isArray(hr) || !hr.length) {
        setRows([]);
        setErrorMsg("No chart data found for this ticker.");
      } else {
        setRows(hr);
      }
    } catch (err) {
      setRows([]);
      setErrorMsg("Ticker not found or backend unavailable.");
    } finally {
      setLoading(false);
    }
  };

  // load initial ticker (from URL or default AAPL)
  useEffect(() => {
    setSymbol(initialSymbol);
    loadHistory(initialSymbol);
  }, [initialSymbol]);

  // chart.js data
  const chartData =
    rows.length > 0
      ? {
          labels: rows.map((r) => r.date),
          datasets: [
            {
              label: `${symbol} Price`,
              data: rows.map((r) => r.close),
              borderColor: "rgba(75,192,192,1)",
              tension: 0.4,
            },
          ],
        }
      : null;

  // draw the overlay trendline
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
    <div className="container" style={{ padding: "24px", color: "white" }}>
      <h1 className="text-3xl font-bold mb-6">
        Trendline Tool for {symbol}
      </h1>

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
            borderRadius: "8px",
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
            borderRadius: "8px",
            color: "white",
            fontWeight: "bold",
            border: "none",
          }}
        >
          Load Chart
        </button>
      </form>

      {errorMsg && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            padding: "12px",
            borderColor: "hsla(0,70%,60%,0.4)",
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading && <div className="muted">Loading chart…</div>}

      {chartData && !loading && (
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "900px",
            height: "450px",
            background: "white",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            marginTop: 20,
          }}
        >
          <Line data={chartData} />

          <canvas
            ref={overlayRef}
            width={900}
            height={450}
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
