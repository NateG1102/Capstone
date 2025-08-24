const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/price/:symbol', stockController.getStockPrice);
router.get('/history/:symbol', stockController.getHistoricalData);

module.exports = router;
