// routes/chatbot.routes.js
const express = require('express');
const router = express.Router();
const chatbotActionController = require('../controllers/chatbot.action.controller');
const { protect } = require('../middleware/auth.middleware');

// Rota para processar ações predefinidas do chatbot
router.post('/action', protect, chatbotActionController.handleAction);

module.exports = router;