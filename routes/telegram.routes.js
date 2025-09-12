// routes/telegram.routes.js
const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegram.controller');

// Rota que o Telegram vai chamar. Precisa ser POST.
router.post('/webhook', telegramController.handleWebhook);

module.exports = router;