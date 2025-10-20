// server/routes/socialRoutes.js
const router = require('express').Router();
const {
  getSocialBySymbol,           // Reddit links
  getTwitterEmbedBySymbol,     // Twitter cashtag embed 
  
} = require('../controllers/socialController');

// Reddit links 
router.get('/:symbol', getSocialBySymbol);

// Twitter cashtag embed (new)
router.get('/twitter/:symbol', getTwitterEmbedBySymbol);

module.exports = router;
