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

module.exports = router;