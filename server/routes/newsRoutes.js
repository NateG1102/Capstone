const router = require('express').Router();
const { getNews } = require('../controllers/newsController');
router.get('/', getNews); // /api/news?symbol=AAPL
module.exports = router;
