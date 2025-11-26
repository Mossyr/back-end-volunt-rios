const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

// ===================================================================
// --- A CORREÇÃO ESTÁ AQUI ---
// Em vez de importar o objeto todo, pegamos apenas a função 'protect' de dentro dele.
const { protect } = require('../middleware/auth.middleware');
// ===================================================================

// @route   GET /api/notificacoes
// @access  Privado
// E aqui usamos a função 'protect' diretamente, em vez da variável 'authMiddleware'.
router.get('/', protect, notificationController.getNotifications);

// @route   POST /api/notificacoes/mark-read
// @access  Privado
router.post('/mark-read', protect, notificationController.markNotificationsAsRead);

// ===================================================================
// --- NOVO: Rota DELETE para excluir notificação ---
// @route   DELETE /api/notificacoes/:id
// @access  Privado
router.delete('/:id', protect, notificationController.deleteNotification);
// ===================================================================

module.exports = router;