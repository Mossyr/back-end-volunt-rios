// routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Middlewares de segurança removidos para acesso local
// const { protect, isAdmin } = require('../middleware/auth.middleware');

// @route   GET /api/admin/usuarios
// @desc    Busca todos os usuários para o painel
// @access  Público (sem segurança)
router.get('/usuarios', adminController.getTodosUsuarios);

// @route   PUT /api/admin/usuarios/:userId/ministerios
// @desc    Atualiza os ministérios de um usuário específico
// @access  Público (sem segurança)
router.put('/usuarios/:userId/ministerios', adminController.atualizarMinisteriosUsuario);

module.exports = router;