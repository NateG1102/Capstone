const router = require('express').Router();
const { getOwnership } = require('../controllers/ownershipController');
router.get('/:symbol', getOwnership);
module.exports = router;
