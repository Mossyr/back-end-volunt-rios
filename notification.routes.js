const express = require('express');
const router = express.Router();
const Notification = require('../models/notification.model');
const authMiddleware = require('../middleware/auth.middleware'); // IMPORTANTE: Use seu middleware de autenticação

// @route   GET /api/notificacoes
// @desc    Busca todas as notificações para o usuário logado
// @access  Privado
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Busca as notificações onde o campo 'user' é o ID do usuário logado (vem do token)
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 }) // Ordena pelas mais recentes primeiro
            .populate('fromUser', 'nome'); // Traz o nome do usuário que enviou a notificação

        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro no servidor');
    }
});

// @route   POST /api/notificacoes/mark-read
// @desc    Marca todas as notificações como lidas
// @access  Privado
router.post('/mark-read', authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false }, 
            { $set: { read: true } }
        );
        res.status(200).json({ msg: 'Notificações marcadas como lidas.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro no servidor');
    }
});


module.exports = router;