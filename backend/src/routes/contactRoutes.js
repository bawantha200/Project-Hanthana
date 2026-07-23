const express = require('express');
const {
  createContactMessage,
  getAllContactMessages,
  deleteContactMessage,
  replyToMessage,
} = require('../controllers/contactController');

const router = express.Router();

router.post('/send-message', createContactMessage);
router.get('/', getAllContactMessages);
router.delete('/:id', deleteContactMessage);
router.post('/:id/reply', replyToMessage);

module.exports = router;
