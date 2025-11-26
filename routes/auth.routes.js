const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware'); // Importa o middleware

// Rota de registro
router.post('/register', authController.register);

// Rota de login
router.post('/login', authController.login);

// --- NOVA ROTA GETME ---
// Só pode ser acessada por usuários logados (com token válido)
router.get('/me', protect, authController.getMe);

// ======================================================
// --- NOVA ROTA DE RESET DIRETO ADICIONADA ---
// ======================================================

// @route   POST /api/auth/admin-reset
// @desc    Reseta a senha de um usuário diretamente
// @access  Público (Como você pediu. Se quiser proteger, adicione 'protect' aqui)
router.post('/admin-reset', authController.adminResetPassword);

module.exports = router;