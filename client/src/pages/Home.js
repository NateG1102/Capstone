import React, { useEffect, useState } from 'react';
import { getStockPrice, getHistoricalData } from '../services/stockAPI';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [stock, setStock] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getStockPrice('AAPL').then(res => setStock(res.data));
    getHistoricalData('AAPL').then(res => setHistory(res.data.slice(-30))); // Last 30 days
  }, []);

  return (
    <div>
      <h1>Stock Dashboard</h1>
      {stock ? (
        <div>
          <h2>{stock.symbol}</h2>
          <p>Price: ${stock.price}</p>
          <p>Change: {stock.change} ({stock.changePercent})</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}

      <h3>Last 30 Days</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(date) => date.slice(5)} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="close" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
