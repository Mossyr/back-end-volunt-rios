// controllers/notification.controller.js

const Notification = require('../models/notification.model');
const Usuario = require('../models/usuario.model');
const axios = require('axios');

// Pega as informações do arquivo .env
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TOKEN}`;

// ===================================================================
// --- FUNÇÃO EXISTENTE: Cria notificação in-app ---
// ===================================================================
/**
 * @desc    Cria e salva uma nova notificação no banco de dados (sininho).
 * @param   {string} userId - ID do usuário destinatário.
 * @param   {string} type - Tipo da notificação (ex: SWAP_REQUEST).
 * @param   {string} message - Mensagem da notificação.
 * @param   {string} relatedId - ID do item relacionado (ex: ID da troca).
 * @param   {string} fromUserId - ID do usuário que enviou (opcional).
 */
exports.createNotification = async (userId, type, message, relatedId = null, fromUserId = null) => {
    try {
        const newNotification = new Notification({
            user: userId,
            type: type,
            message: message,
            relatedId: relatedId,
            fromUser: fromUserId 
        });
        await newNotification.save();
        console.log(`Notificação in-app criada para o usuário ${userId}.`);
        return true;
    } catch (error) {
        console.error("Erro ao criar notificação in-app:", error.message);
        return false;
    }
};
// ===================================================================


// @desc    Busca todas as notificações do "sininho"
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            // O populate pode ser o ponto de falha se o ref estiver errado.
            // Se o seu modelo de usuário for 'Usuario', mude a referência no modelo da notificação.
            .populate('fromUser', 'nome'); 
        res.json(notifications);
    } catch (error) {
        console.error("Erro ao buscar notificações:", error);
        res.status(500).json({ msg: 'Erro interno ao buscar notificações.' }); // Melhor feedback de erro
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
        // Ignora erros de "bot was blocked by the user" ou chat ID inválido, apenas loga.
        console.error(`Erro ao enviar notificação para ${usuarioId}:`, error.response ? error.response.data.description : error.message);
        return false;
    }
};

// ===================================================================
// --- NOVO: Função para excluir notificação pelo ID ---
// ===================================================================
/**
 * @desc    Exclui uma notificação pelo seu ID.
 * @route   DELETE /api/notificacoes/:id
 * @access  Privado
 */
exports.deleteNotification = async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id; // Usuário logado

        // Tenta encontrar e deletar a notificação
        const notification = await Notification.findOneAndDelete({ 
            _id: notificationId, 
            user: userId // Garante que o usuário só pode deletar as próprias notificações
        });

        if (!notification) {
            // Pode ser 404 se não for encontrada, ou 401/403 se o usuário tentar deletar a notificação de outro
            return res.status(404).json({ msg: 'Notificação não encontrada ou você não tem permissão para excluí-la.' });
        }

        res.status(200).json({ msg: 'Notificação excluída com sucesso.', id: notificationId });

    } catch (error) {
        console.error("Erro ao excluir notificação:", error);
        // O erro 500 é para problemas internos, como ID mal formatado
        res.status(500).json({ msg: 'Erro interno ao excluir notificação.', error: error.message }); 
    }
};