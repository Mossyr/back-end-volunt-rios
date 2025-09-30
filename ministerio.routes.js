const express = require('express');
const router = express.Router();
const ministerioController = require('../controllers/ministerio.controller');

// Importa os middlewares de autenticação e autorização
const { protect, isLeader } = require('../middleware/auth.middleware');

// Rota para criar um novo ministério (Ação de líder, continua protegida - CORRETO)
router.post('/', protect, isLeader, ministerioController.createMinisterio);

// Rota para listar todos os ministérios
// --- CORREÇÃO APLICADA AQUI ---
// Removemos o "protect" para que esta rota seja PÚBLICA.
// Assim, novos usuários podem ver a lista durante o cadastro.
router.get('/', ministerioController.getAllMinisterios);


// Rota para buscar voluntários de um ministério específico (Ação de líder, continua protegida - CORRETO)
router.get('/:ministerioId/voluntarios', protect, isLeader, ministerioController.getVoluntariosPorMinisterio);

module.exports = router;