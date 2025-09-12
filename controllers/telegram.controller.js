// controllers/telegram.controller.js
const axios = require('axios');
const Usuario = require('../models/usuario.model');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${TOKEN}`;

// Função para enviar uma resposta de volta para o Telegram
async function sendMessage(chatId, text, replyMarkup = {}) {
    try {
        await axios.post(`${API_URL}/sendMessage`, {
            chat_id: chatId,
            text: text,
            reply_markup: replyMarkup
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem de resposta:', error.response ? error.response.data : error.message);
    }
}

// Lida com o comando /start
async function handleStartCommand(chatId) {
    const text = 'Olá! Para conectar sua conta e receber notificações, por favor, compartilhe seu contato clicando no botão abaixo.';
    const replyMarkup = {
        keyboard: [
            [{
                text: 'Compartilhar Meu Contato',
                request_contact: true // Este é o botão especial do Telegram
            }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
    };
    await sendMessage(chatId, text, replyMarkup);
}

// Lida com o compartilhamento de contato
async function handleContactShare(chatId, contact) {
    const phoneNumber = contact.phone_number.replace('+', ''); // Remove o '+' se houver

    try {
        const usuario = await Usuario.findOneAndUpdate(
            { celular: phoneNumber }, // Encontra o usuário pelo número de celular
            { telegramChatId: chatId }, // Atualiza o campo com o ID do chat
            { new: true }
        );

        if (usuario) {
            await sendMessage(chatId, `Obrigado, ${usuario.nome}! ✅ Sua conta foi vinculada com sucesso. Agora você está pronto para receber notificações de escala.`);
        } else {
            await sendMessage(chatId, `Não consegui encontrar uma conta com o número de telefone ${contact.phone_number}. Por favor, verifique se o número cadastrado no aplicativo é o mesmo do seu Telegram.`);
        }
    } catch (error) {
        console.error('Erro ao vincular contato:', error);
        await sendMessage(chatId, 'Ocorreu um erro ao tentar vincular sua conta. Por favor, tente novamente mais tarde.');
    }
}

// Função principal que recebe o Webhook
exports.handleWebhook = async (req, res) => {
    const update = req.body;
    
    // Se a mensagem contiver um contato compartilhado
    if (update.message && update.message.contact) {
        await handleContactShare(update.message.chat.id, update.message.contact);
    }
    // Se a mensagem for um texto e for '/start'
    else if (update.message && update.message.text === '/start') {
        await handleStartCommand(update.message.chat.id);
    }

    // Responda ao Telegram com status 200 OK para confirmar o recebimento
    res.sendStatus(200);
};