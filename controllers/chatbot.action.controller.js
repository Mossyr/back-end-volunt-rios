// controllers/chatbot.action.controller.js
const ChatbotService = require('../services/chatbot.service');
const Usuario = require('../models/usuario.model');

exports.handleAction = async (req, res) => {
    // Adicionamos 'ministerioId', 'turno' e 'voluntarios' para receber os dados da conversa
    const { action, turnoId, voluntarioId, data, ministerioId, turno, voluntarios } = req.body;
    
    try {
        const usuarioLogado = await Usuario.findById(req.user.id).populate('ministerios.ministerio', 'nome');
        let responsePayload;

        switch (action) {
            // AÇÕES EXISTENTES
            case 'PROXIMA_ESCALA':
                responsePayload = { type: 'message', reply: await ChatbotService.getProximaEscala(usuarioLogado) };
                break;
            case 'ESCALAS_MES':
                responsePayload = { type: 'message', reply: await ChatbotService.getEscalasDoMes(usuarioLogado) };
                break;
            case 'SOLICITAR_TROCA':
                responsePayload = await ChatbotService.prepararTrocaDeEscala(usuarioLogado);
                break;
            case 'CONFIRMAR_TROCA':
                responsePayload = { type: 'message', reply: await ChatbotService.iniciarTrocaComTelegram(usuarioLogado, turnoId, voluntarioId) };
                break;
            case 'SET_UNAVAILABLE':
                responsePayload = { type: 'message', reply: await ChatbotService.setUnavailableFromBot(usuarioLogado, data) };
                break;

            // --- NOVO FLUXO DE CRIAÇÃO DE ESCALA ---
            case 'CRIAR_ESCALA_INICIAR':
                responsePayload = await ChatbotService.iniciarCriacaoDeEscala(usuarioLogado);
                break;

            case 'CRIAR_ESCALA_PEDIR_DATA':
                responsePayload = {
                    type: 'date_picker_creation',
                    reply: 'Ótima escolha! Agora, por favor, selecione a data para a nova escala.',
                    context: { ministerioId: ministerioId }
                };
                break;

            case 'CRIAR_ESCALA_PEDIR_TURNO':
                responsePayload = await ChatbotService.pedirTurno(ministerioId, data);
                break;

            case 'CRIAR_ESCALA_PEDIR_VOLUNTARIOS':
                responsePayload = await ChatbotService.getVoluntariosParaCriacao(ministerioId, data);
                // Adiciona o contexto para o próximo passo
                responsePayload.context = { ministerioId, data, turno };
                break;
            
            case 'CRIAR_ESCALA_CONFIRMAR':
                const confirmMsg = await ChatbotService.criarEscalaPeloChat(usuarioLogado.id, ministerioId, data, turno, voluntarios);
                responsePayload = { type: 'message', reply: confirmMsg };
                break;

            default:
                responsePayload = { type: 'message', reply: 'Desculpe, não entendi essa ação. 🤔' };
        }
        res.json(responsePayload);
    } catch (error) {
        console.error(`Erro ao executar a ação ${action}:`, error);
        res.status(500).json({ type: 'message', reply: 'Ocorreu um erro interno.' });
    }
};