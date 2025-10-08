// server/routes/socialRoutes.js
const router = require('express').Router();
const { getSocialBySymbol } = require('../controllers/socialController');

router.get('/:symbol', getSocialBySymbol);

module.exports = router;
