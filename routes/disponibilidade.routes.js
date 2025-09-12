// routes/disponibilidade.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const disponibilidadeController = require('../controllers/disponibilidade.controller');

// Rota para buscar as indisponibilidades do usuário logado
router.get('/me', protect, disponibilidadeController.getMinhasDisponibilidades);

// Rota para adicionar ou remover uma indisponibilidade
router.post('/toggle', protect, disponibilidadeController.toggleDisponibilidade);

module.exports = router;