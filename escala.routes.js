// routes/escala.routes.js

const express = require('express');
const router = express.Router();
const escalaController = require('../controllers/escala.controller');
const { protect, isLeader } = require('../middleware/auth.middleware');

// Rotas específicas do usuário logado
router.get('/me/proximo', protect, escalaController.getProximoTurno);
router.get('/me/todas', protect, escalaController.getMinhasEscalas);

// --- ROTAS PARA UM TURNO ESPECÍFICO ---
// Busca um turno pelo ID
router.get('/turno/:turnoId', protect, escalaController.getTurnoById);
// Exclui um turno
router.delete('/turno/:turnoId', protect, escalaController.deleteTurno);
// Atualiza um turno
router.put('/turno/:turnoId', protect, escalaController.updateTurno);

// --- ROTAS PARA GERENCIAR TROCAS ---
// @desc    Busca voluntários disponíveis para troca em uma escala específica
// @route   GET /api/escalas/:turnoId/voluntarios-para-troca
// @access  Privado
router.get('/:turnoId/voluntarios-para-troca', protect, escalaController.getVoluntariosParaTroca);

// ===================================================================
// --- NOVA ROTA ADICIONADA ---
// @desc    Cria uma nova solicitação de troca de escala e notifica o destinatário
// @route   POST /api/escalas/trocas/solicitar
// @access  Privado
router.post('/trocas/solicitar', protect, escalaController.solicitarTroca);
// ===================================================================

// --- ROTAS DE LÍDER ---
// Rota de criação de escala (turno)
router.post('/', protect, isLeader, escalaController.createTurno);
// Rota para buscar escalas de um ministério
router.get('/ministerio/:ministerioId', protect, isLeader, escalaController.getTurnosPorMinisterio);


module.exports = router;