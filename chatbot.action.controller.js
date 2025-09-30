// controllers/chatbot.action.controller.js

// 1. IMPORTAÇÕES
const { enviarNotificacaoTelegram } = require('./notificacao.controller');
const Turno = require('../models/escala.model');
const Usuario = require('../models/usuario.model');
const Disponibilidade = require('../models/disponibilidade.model');

// Função principal que direciona a ação para a função correta
exports.handleAction = async (req, res) => {
    const { action, turnoId, voluntarioId, data } = req.body;
    const usuarioLogado = req.user;

    try {
        let responsePayload;
        switch (action) {
            case 'PROXIMA_ESCALA':
                responsePayload = { type: 'message', reply: await getProximaEscala(usuarioLogado) };
                break;
            case 'ESCALAS_MES':
                responsePayload = { type: 'message', reply: await getEscalasDoMes(usuarioLogado) };
                break;
            case 'SOLICITAR_TROCA':
                responsePayload = await prepararTrocaDeEscala(usuarioLogado);
                break;
            case 'CONFIRMAR_TROCA':
                responsePayload = { type: 'message', reply: await iniciarTrocaComTelegram(usuarioLogado, turnoId, voluntarioId) };
                break;
            case 'SET_UNAVAILABLE':
                responsePayload = { type: 'message', reply: await setUnavailableFromBot(usuarioLogado, data) };
                break;
            // --- INÍCIO DA ALTERAÇÃO: NOVA AÇÃO PARA LÍDERES ---
            case 'CRIAR_ESCALA_INICIAR':
                responsePayload = await iniciarCriacaoDeEscala(usuarioLogado);
                break;
            // --- FIM DA ALTERAÇÃO ---
            default:
                responsePayload = { type: 'message', reply: 'Desculpe, não entendi essa ação. 🤔' };
        }
        res.json(responsePayload);
    } catch (error) {
        console.error(`Erro ao executar a ação ${action}:`, error);
        res.status(500).json({ type: 'message', reply: 'Ocorreu um erro interno ao processar sua solicitação.' });
    }
};

// --- INÍCIO DA ALTERAÇÃO: NOVA FUNÇÃO PARA LISTAR MINISTÉRIOS DO LÍDER ---
async function iniciarCriacaoDeEscala(usuario) {
    // Filtra apenas os ministérios onde o usuário é um líder aprovado
    const liderancas = usuario.ministerios.filter(m => m.funcao === 'Líder' && m.status === 'Aprovado');

    if (liderancas.length === 0) {
        return { type: 'message', reply: "Parece que você não tem permissão de liderança em nenhum ministério para criar escalas." };
    }

    // Mapeia os dados para um formato mais simples para o frontend
    const ministeriosDoLider = liderancas.map(l => ({
        name: l.ministerio.nome,
        id: l.ministerio._id
    }));

    return {
        type: 'ministry_list_for_creation',
        reply: 'Certo! Você é líder nos seguintes ministérios. Para qual deles você quer criar uma escala?',
        ministries: ministeriosDoLider
    };
}
// --- FIM DA ALTERAÇÃO ---


// --- FUNÇÃO DE TROCA ATUALIZADA COM MELHORES VERIFICAÇÕES ---
async function iniciarTrocaComTelegram(solicitante, turnoId, voluntarioAlvoId) {
    if (!turnoId || !voluntarioAlvoId) {
        return "Parece que faltaram informações para confirmar a troca. Por favor, tente o processo novamente.";
    }
    const voluntarioAlvo = await Usuario.findById(voluntarioAlvoId).select('nome');
    const turno = await Turno.findById(turnoId).populate('ministerio', 'nome');
    if (!voluntarioAlvo) {
        console.error(`Erro na troca: Voluntário alvo com ID ${voluntarioAlvoId} não encontrado.`);
        return "Não consegui encontrar o voluntário para quem você quer pedir a troca. Tente novamente.";
    }
    if (!turno) {
        console.error(`Erro na troca: Turno/Escala com ID ${turnoId} não encontrado.`);
        return "Não consegui encontrar os detalhes da sua escala para a troca. Tente iniciar o processo novamente.";
    }
    const dataFormatada = new Date(turno.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
    const mensagemDeTroca = `Olá, ${voluntarioAlvo.nome}! 👋\n\nO(A) *${solicitante.nome}* gostaria de saber se você pode trocar de escala com ele(a) no dia *${dataFormatada}* (Ministério: ${turno.ministerio.nome}, Turno: ${turno.turno}).\n\nPor favor, entre em contato diretamente com o(a) ${solicitante.nome} para combinar.`;
    const notificadoComSucesso = await enviarNotificacaoTelegram(voluntarioAlvoId, mensagemDeTroca);
    if (notificadoComSucesso) {
        return `Ótima escolha! 👍\n\nJá enviei a solicitação de troca para o(a) **${voluntarioAlvo.nome}** via Telegram. Agora é só aguardar o contato dele(a).`;
    } else {
        return `Puxa! 😟 Tentei notificar o(a) **${voluntarioAlvo.nome}**, mas ele(a) ainda não cadastrou o Telegram no aplicativo. Tente entrar em contato por outro meio.`;
    }
}

// --- Funções restantes (sem alterações) ---

async function prepararTrocaDeEscala(usuario) {
    const proximoTurno = await Turno.findOne({ voluntarios: usuario.id, data: { $gte: new Date() } })
        .sort({ data: 1 });
    if (!proximoTurno) {
        return { type: 'message', reply: "Você precisa ter uma escala futura para poder solicitar uma troca. 😉" };
    }
    const dataDoTurno = new Date(proximoTurno.data).toISOString().split('T')[0];
    const indisponibilidades = await Disponibilidade.find({ data: dataDoTurno }).select('usuario');
    const idsIndisponiveis = indisponibilidades.map(i => i.usuario);
    const voluntariosElegiveis = await Usuario.find({
        '_id': { $nin: [...proximoTurno.voluntarios, ...idsIndisponiveis] }, 
        'ministerios.ministerio': proximoTurno.ministerio,
        'ministerios.status': 'Aprovado'
    }).select('nome sobrenome');
    if (voluntariosElegiveis.length === 0) {
        return { type: 'message', reply: "Puxa, não encontrei nenhum voluntário disponível para trocar nesta data. 😟" };
    }
    const dataFormatada = new Date(proximoTurno.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    const introMessage = `Entendi! Para sua escala de **${dataFormatada}**, encontrei as seguintes pessoas disponíveis para troca. Com quem você gostaria de falar?`;
    return {
        type: 'volunteer_list',
        reply: introMessage,
        volunteers: voluntariosElegiveis,
        turnoId: proximoTurno._id
    };
}

async function setUnavailableFromBot(usuario, dataString) {
    if (!dataString) {
        return 'Por favor, diga a data que quer marcar como indisponível (formato AAAA-MM-DD).';
    }
    try {
        const registro = await Disponibilidade.findOne({ usuario: usuario.id, data: dataString });
        if (registro) {
            const dataFormatada = new Date(dataString + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'});
            return `Você já marcou o dia **${dataFormatada}** como indisponível.`;
        }
        const indisponibilidade = new Disponibilidade({ usuario: usuario.id, data: dataString, status: 'Indisponível' });
        await indisponibilidade.save();
        const dataFormatada = new Date(dataString + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        return `Ok! ✅ Marquei o dia **${dataFormatada}** como indisponível para você.`;
    } catch (error) {
        console.error("Erro ao marcar indisponibilidade pelo bot:", error);
        return 'Não consegui salvar sua indisponibilidade. Tente novamente.';
    }
}

async function getProximaEscala(usuario) {
    const proximoTurno = await Turno.findOne({ voluntarios: usuario.id, data: { $gte: new Date() } })
        .sort({ data: 1 })
        .populate('ministerio', 'nome');
    if (!proximoTurno) {
        return 'Você não tem nenhuma escala futura agendada. Aproveite para descansar! 😄';
    }
    const dataFormatada = new Date(proximoTurno.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    return `Sua próxima escala é no ministério de **${proximoTurno.ministerio.nome}**, no dia **${dataFormatada}**, no turno da **${proximoTurno.turno}**.`;
}

async function getEscalasDoMes(usuario) {
    const hoje = new Date();
    const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const turnosDoMes = await Turno.find({
        voluntarios: usuario.id,
        data: { $gte: inicioDoMes, $lte: fimDoMes }
    }).sort({ data: 1 }).populate('ministerio', 'nome');
    if (turnosDoMes.length === 0) {
        return 'Você não está escalado para nenhum turno neste mês. 👍';
    }
    let resposta = 'Certo! Aqui estão suas escalas para este mês:\n\n';
    turnosDoMes.forEach(turno => {
        const dataFormatada = new Date(turno.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
        resposta += `- **${dataFormatada}**: ${turno.ministerio.nome} (Turno: ${turno.turno})\n`;
    });
    return resposta;
}