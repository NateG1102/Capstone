
const router = require('express').Router();
const stock = require('../controllers/stockController');

router.get('/price/:symbol', stock.getStockPrice);
router.get('/history/:symbol', stock.getHistoricalDaily);
router.get('/quotes', stock.listQuotes);

module.exports = router;
