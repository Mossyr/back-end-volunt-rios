const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

// @route   GET /api/notificacoes
// @desc    Busca todas as notificações para o usuário logado
// @access  Privado
router.get('/', authMiddleware, notificationController.getNotifications);

// @route   POST /api/notificacoes/mark-read
// @desc    Marca todas as notificações como lidas
// @access  Privado
router.post('/mark-read', authMiddleware, notificationController.markNotificationsAsRead);

module.exports = router;