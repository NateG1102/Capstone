const router = require('express').Router();
const {
  getStockPrice,
  getHistoricalDaily,
  listQuotes,
  getTrendPrediction,
} = require('../controllers/stockController');

router.get('/price/:symbol', getStockPrice);
router.get('/history/:symbol', getHistoricalDaily);
router.get('/quotes', listQuotes);
router.get('/predict/:symbol', getTrendPrediction);

module.exports = router;
