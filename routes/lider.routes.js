const express = require('express');
const router = express.Router();
const liderController = require('../controllers/lider.controller');
const { protect, isLeader } = require('../middleware/auth.middleware');

// Rota para buscar voluntários pendentes
router.get('/pendentes/:ministerioId', protect, isLeader, liderController.getPendingVolunteers);

// Rota para aprovar um voluntário
router.put('/aprovar', protect, liderController.approveVolunteer);

// --- ROTA ADICIONADA ---
// Rota para buscar voluntários aprovados de um ministério
router.get('/voluntarios/:ministerioId', protect, isLeader, liderController.getApprovedVolunteers);

module.exports = router;
