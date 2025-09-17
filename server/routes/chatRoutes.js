const router = require('express').Router();
const { chat } = require('../controllers/chatController');

// POST /api/chat
router.post('/', chat);

module.exports = router;