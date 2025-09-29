// server/routes/ownershipRoutes.js
const router = require('express').Router();
const { getInstitutionalOwnership } = require('../controllers/ownershipController');

router.get('/:symbol', getInstitutionalOwnership);

module.exports = router;
