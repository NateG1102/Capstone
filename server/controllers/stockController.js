const axios = require('axios');

exports.getStockPrice = async (req, res) => {
  const { symbol } = req.params;
  const API_KEY = process.env.STOCK_API_KEY;

  try {
    const response = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: API_KEY
      }
    });

    const data = response.data['Global Quote'];
    if (!data) return res.status(404).json({ error: 'Stock not found' });

    res.json({
      symbol: data['01. symbol'],
      price: data['05. price'],
      change: data['09. change'],
      changePercent: data['10. change percent']
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
};

// NEW: Historical Data
exports.getHistoricalData = async (req, res) => {
  const { symbol } = req.params;
  const API_KEY = process.env.STOCK_API_KEY;

  try {
    const response = await axios.get(`https://www.alphavantage.co/query`, {
      params: {
        function: 'TIME_SERIES_DAILY_ADJUSTED',
        symbol: symbol,
        outputsize: 'full',
        apikey: API_KEY
      }
    });

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) return res.status(404).json({ error: 'No historical data' });

    // Convert object to array for frontend charts
    const formattedData = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        close: parseFloat(values['4. close'])
      }))
      .reverse(); // oldest to newest

    res.json(formattedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
};
