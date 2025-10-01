const express = require('express');
const router = express.Router();
const liderController = require('../controllers/lider.controller');
const { protect, isLeader } = require('../middleware/auth.middleware');

// Rota para buscar voluntários pendentes
router.get('/pendentes/:ministerioId', protect, isLeader, liderController.getPendingVolunteers);

// Rota para aprovar um voluntário
router.put('/aprovar', protect, isLeader, liderController.approveVolunteer);

// Rota para buscar voluntários aprovados de um ministério
router.get('/voluntarios/:ministerioId', protect, isLeader, liderController.getApprovedVolunteers);

// ===================================================================
// --- NOVA ROTA ADICIONADA PARA O DASHBOARD ---
// ===================================================================
// @desc    Busca os dados agregados para o painel de gerenciamento do líder
// @route   GET /api/lider/dashboard/:ministerioId
// @access  Líder daquele ministério
router.get('/dashboard/:ministerioId', protect, isLeader, liderController.getDashboardData);


module.exports = router;