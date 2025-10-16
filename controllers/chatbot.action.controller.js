// controllers/chatbot.action.controller.js
const ChatbotService = require('../services/chatbot.service');

// Função principal que direciona a ação para a função correta
exports.handleAction = async (req, res) => {
    const { action, turnoId, voluntarioId, data } = req.body;
    const usuarioLogado = req.user;

    try {
        let responsePayload;

        switch (action) {
            case 'PROXIMA_ESCALA':
                const proximaEscalaMsg = await ChatbotService.getProximaEscala(usuarioLogado);
                responsePayload = { type: 'message', reply: proximaEscalaMsg };
                break;

            case 'ESCALAS_MES':
                const escalasMesMsg = await ChatbotService.getEscalasDoMes(usuarioLogado);
                responsePayload = { type: 'message', reply: escalasMesMsg };
                break;

            case 'SOLICITAR_TROCA':
                responsePayload = await ChatbotService.prepararTrocaDeEscala(usuarioLogado);
                break;

            case 'CONFIRMAR_TROCA':
                const trocaMsg = await ChatbotService.iniciarTrocaComTelegram(usuarioLogado, turnoId, voluntarioId);
                responsePayload = { type: 'message', reply: trocaMsg };
                break;

            case 'SET_UNAVAILABLE':
                const unavailableMsg = await ChatbotService.setUnavailableFromBot(usuarioLogado, data);
                responsePayload = { type: 'message', reply: unavailableMsg };
                break;

            case 'CRIAR_ESCALA_INICIAR':
                responsePayload = await ChatbotService.iniciarCriacaoDeEscala(usuarioLogado);
                break;

            default:
                responsePayload = { type: 'message', reply: 'Desculpe, não entendi essa ação. 🤔' };
        }
        res.json(responsePayload);
    } catch (error) {
        console.error(`Erro ao executar a ação ${action}:`, error);
        res.status(500).json({ type: 'message', reply: 'Ocorreu um erro interno ao processar sua solicitação.' });
    }
};