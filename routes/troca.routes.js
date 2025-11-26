// routes/troca.routes.js

const express = require('express');
const router = express.Router();
const trocaController = require('../controllers/troca.controller');
const { protect } = require('../middleware/auth.middleware');

// @desc    Obtém os detalhes de uma solicitação de troca
// @route   GET /api/trocas/:trocaId
// @access  Privado (apenas solicitante ou destinatário podem ver)
router.get('/:trocaId', protect, trocaController.getTrocaDetails);

// @desc    Aceita uma solicitação de troca
// @route   POST /api/trocas/aceitar
// @access  Privado (apenas destinatário pode aceitar)
router.post('/aceitar', protect, trocaController.aceitarTroca);

// @desc    Recusa uma solicitação de troca
// @route   POST /api/trocas/recusar
// @access  Privado (apenas destinatário pode recusar)
router.post('/recusar', protect, trocaController.recusarTroca);

module.exports = router;