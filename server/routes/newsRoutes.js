const router = require('express').Router();
const { getNewsBySymbol } = require('../controllers/newsController');

router.get('/:symbol', getNewsBySymbol);

module.exports = router;
