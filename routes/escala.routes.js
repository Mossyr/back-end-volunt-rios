// routes/escala.routes.js

const express = require('express');
const router = express.Router();
const escalaController = require('../controllers/escala.controller');
const { protect, isLeader } = require('../middleware/auth.middleware');

// ===================================================================
// --- NOVA ROTA ADICIONADA ---
// @desc    Busca as escalas públicas dos ministérios do usuário
// @route   GET /api/escalas/publicas
// @access  Privado
router.get('/publicas', protect, escalaController.getPublicEscalas);
// ===================================================================

// Rotas específicas do usuário logado
router.get('/me/proximo', protect, escalaController.getProximoTurno);
router.get('/me/todas', protect, escalaController.getMinhasEscalas);

// --- ROTAS PARA UM TURNO ESPECÍFICO ---
router.get('/turno/:turnoId', protect, escalaController.getTurnoById);
router.delete('/turno/:turnoId', protect, escalaController.deleteTurno);
router.put('/turno/:turnoId', protect, escalaController.updateTurno);

// --- ROTAS PARA GERENCIAR TROCAS ---
router.get('/:turnoId/voluntarios-para-troca', protect, escalaController.getVoluntariosParaTroca);
router.post('/trocas/solicitar', protect, escalaController.solicitarTroca);

// --- ROTAS DE LÍDER ---
router.post('/', protect, isLeader, escalaController.createTurno);
router.get('/ministerio/:ministerioId', protect, isLeader, escalaController.getTurnosPorMinisterio);

module.exports = router;