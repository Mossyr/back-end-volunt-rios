// controllers/chatbot.action.controller.js
const ChatbotService = require('../services/chatbot.service');
const Usuario = require('../models/usuario.model');

exports.handleAction = async (req, res) => {
    // Adicionamos 'ministerioId', 'turno' e 'voluntarios' ao destructuring
    const { action, turnoId, voluntarioId, data, ministerioId, turno, voluntarios } = req.body;
    
    try {
        const usuarioLogado = await Usuario.findById(req.user.id).populate('ministerios.ministerio', 'nome');
        let responsePayload;

        switch (action) {
            // --- AÇÕES EXISTENTES ---
            case 'PROXIMA_ESCALA': /* ...código existente... */ break;
            case 'ESCALAS_MES': /* ...código existente... */ break;
            case 'SOLICITAR_TROCA': /* ...código existente... */ break;
            case 'CONFIRMAR_TROCA': /* ...código existente... */ break;
            case 'SET_UNAVAILABLE': /* ...código existente... */ break;

            // --- NOVO FLUXO DE CRIAÇÃO DE ESCALA ---
            case 'CRIAR_ESCALA_INICIAR':
                responsePayload = await ChatbotService.iniciarCriacaoDeEscala(usuarioLogado);
                break;

            case 'CRIAR_ESCALA_PEDIR_DATA':
                // O usuário escolheu o ministério, agora o bot pede a data.
                responsePayload = {
                    type: 'date_picker_creation',
                    reply: 'Ótima escolha! Agora, por favor, selecione a data para a nova escala.',
                    // Passamos o ministerioId para a próxima etapa
                    context: { ministerioId: ministerioId }
                };
                break;

            case 'CRIAR_ESCALA_PEDIR_TURNO':
                // O usuário escolheu a data, agora o bot pede o turno.
                responsePayload = await ChatbotService.pedirTurno(ministerioId, data);
                break;

            case 'CRIAR_ESCALA_PEDIR_VOLUNTARIOS':
                // O usuário escolheu o turno, agora o bot pede os voluntários.
                // Passamos todo o contexto para a próxima etapa.
                responsePayload = await ChatbotService.getVoluntariosParaCriacao(ministerioId, data);
                responsePayload.context = { ministerioId, data, turno };
                break;
            
            case 'CRIAR_ESCALA_CONFIRMAR':
                // O usuário confirmou os voluntários, agora criamos a escala.
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

// Bloco para manter as ações existentes funcionando
exports.handleAction.case = (action, handler) => { /* ... */ };
