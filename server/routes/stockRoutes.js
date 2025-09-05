const router = require('express').Router();
const { getStockPrice, getHistoricalDaily } = require('../controllers/stockController');

router.get('/price/:symbol', getStockPrice);
router.get('/history/:symbol', getHistoricalDaily);

module.exports = router;
