const axios = require('axios');
const Usuario = require('../models/usuario.model');

// Pega as informações do arquivo .env
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `${process.env.TELEGRAM_API_URL}${TOKEN}`;

/**
 * Envia uma mensagem para um usuário específico via Telegram.
 * @param {string} usuarioId - O ID do usuário no seu banco de dados (MongoDB).
 * @param {string} mensagem - O texto que você quer enviar.
 * @returns {Promise<boolean>} - Retorna true se enviado com sucesso, false caso contrário.
 */
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
            parse_mode: 'Markdown' // Permite usar *negrito* e _itálico_
        });

        console.log(`Notificação via Telegram enviada com sucesso para ${usuario.nome}.`);
        return true;

    } catch (error) {
        console.error(`Erro ao enviar notificação para ${usuarioId}:`, error.response ? error.response.data.description : error.message);
        return false;
    }
};