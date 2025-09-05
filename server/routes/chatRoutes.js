const router = require('express').Router();
const { postChat } = require('../controllers/chatController');
router.post('/', postChat);
module.exports = router;
