import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { fetchHistory } from "../services/stockAPI";

export default function MiniChart({ symbol }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetchHistory(symbol);
        const hr = res?.data?.rows ?? res?.data ?? [];

        // Normalize dates just like StockDetails
        const norm = hr
          .map(r => {
            const d = r.date instanceof Date ? r.date : new Date(r.date);
            return { ...r, iso: d.toISOString(), _date: d };
          })
          .filter(r => !Number.isNaN(r._date));

        if (mounted) setRows(norm);
      } catch (e) {
        console.log("MiniChart error:", e);
      }
    })();

    return () => (mounted = false);
  }, [symbol]);

  if (!rows.length)
    return <div className="muted small">No chart data</div>;

  return (
    <div style={{ height: 150 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <Line
            type="monotone"
            dataKey="close"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
