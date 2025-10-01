// controllers/notification.controller.js

const Notification = require('../models/notification.model');
const Usuario = require('../models/usuario.model');
const axios = require('axios');

// Pega as informações do arquivo .env
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TOKEN}`;

// @desc    Busca todas as notificações do "sininho"
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

// @desc    Marca todas as notificações do "sininho" como lidas
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

// @desc    Envia uma mensagem para um usuário específico via Telegram
exports.enviarNotificacaoTelegram = async (usuarioId, mensagem) => {
    try {
        const usuario = await Usuario.findById(usuarioId).select('nome telegramChatId');
        if (!usuario || !usuario.telegramChatId) {
            console.log(`Usuário ${usuarioId} não encontrado ou sem ID do Telegram para notificar.`);
            return false;
        }
        await axios.post(`${API_URL}/sendMessage`, {
            chat_id: usuario.telegramChatId,
            text: mensagem,
            parse_mode: 'Markdown'
        });
        console.log(`Notificação via Telegram enviada com sucesso para ${usuario.nome}.`);
        return true;
    } catch (error) {
        console.error(`Erro ao enviar notificação para ${usuarioId}:`, error.response ? error.response.data.description : error.message);
        return false;
    }
};