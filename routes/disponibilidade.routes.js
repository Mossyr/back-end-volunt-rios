const express = require('express');
const router = express.Router();
// Garanta que o caminho aqui aponta para o arquivo acima
const controller = require('../controllers/disponibilidade.controller');
const { protect } = require('../middleware/auth.middleware');

// Rota para buscar (GET)
router.get('/me', protect, controller.getMyDisponibilidade);

// Rota para salvar/atualizar (POST)
router.post('/save', protect, controller.saveDisponibilidade);

// Rota para deletar (DELETE)
router.delete('/delete', protect, controller.deleteDisponibilidade);

module.exports = router;