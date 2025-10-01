const Notification = require('../models/notification.model');

// @desc    Busca todas as notificações para o usuário logado
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate('fromUser', 'nome');
        res.json(notifications);
    } catch (error) {
        console.error("Erro ao buscar notificações:", error);
        res.status(500).send('Erro no servidor');
    }
};

// @desc    Marca todas as notificações do usuário como lidas
exports.markNotificationsAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false }, 
            { $set: { read: true } }
        );
        res.status(200).json({ msg: 'Notificações marcadas como lidas.' });
    } catch (error) {
        console.error("Erro ao marcar notificações como lidas:", error);
        res.status(500).send('Erro no servidor');
    }
};