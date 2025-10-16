// services/chatbot.service.js
const Turno = require('../models/escala.model');
const Usuario = require('../models/usuario.model');
const Disponibilidade = require('../models/disponibilidade.model');
const { enviarNotificacaoTelegram } = require('../controllers/notification.controller');
const { formatarDataAmigavel, formatarDataCurta } = require('../utils/date.utils');

class ChatbotService {

    static async getProximaEscala(usuario) {
        const proximoTurno = await Turno.findOne({ voluntarios: usuario.id, data: { $gte: new Date() } })
            .sort({ data: 1 })
            .populate('ministerio', 'nome');

        if (!proximoTurno) {
            return 'Você não tem nenhuma escala futura agendada. Aproveite para descansar! 😄';
        }
        
        const dataFormatada = formatarDataAmigavel(proximoTurno.data);
        return `Sua próxima escala é no ministério de **${proximoTurno.ministerio.nome}**, no dia **${dataFormatada}**, no turno da **${proximoTurno.turno}**.`;
    }

    static async getEscalasDoMes(usuario) {
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
            const dataFormatada = formatarDataCurta(turno.data);
            resposta += `- **${dataFormatada}**: ${turno.ministerio.nome} (Turno: ${turno.turno})\n`;
        });
        return resposta;
    }

    static async prepararTrocaDeEscala(usuario) {
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

        const dataFormatada = formatarDataAmigavel(proximoTurno.data);
        const introMessage = `Entendi! Para sua escala de **${dataFormatada}**, encontrei as seguintes pessoas disponíveis para troca. Com quem você gostaria de falar?`;
        
        return {
            type: 'volunteer_list',
            reply: introMessage,
            volunteers: voluntariosElegiveis,
            turnoId: proximoTurno._id
        };
    }

    static async iniciarTrocaComTelegram(solicitante, turnoId, voluntarioAlvoId) {
        if (!turnoId || !voluntarioAlvoId) {
            return "Parece que faltaram informações para confirmar a troca. Por favor, tente o processo novamente.";
        }
        
        const [voluntarioAlvo, turno] = await Promise.all([
            Usuario.findById(voluntarioAlvoId).select('nome'),
            Turno.findById(turnoId).populate('ministerio', 'nome')
        ]);

        if (!voluntarioAlvo) {
            console.error(`Erro na troca: Voluntário alvo com ID ${voluntarioAlvoId} não encontrado.`);
            return "Não consegui encontrar o voluntário para quem você quer pedir a troca. Tente novamente.";
        }
        if (!turno) {
            console.error(`Erro na troca: Turno/Escala com ID ${turnoId} não encontrado.`);
            return "Não consegui encontrar os detalhes da sua escala para a troca. Tente iniciar o processo novamente.";
        }

        const dataFormatada = formatarDataCurta(turno.data);
        const mensagemDeTroca = `Olá, ${voluntarioAlvo.nome}! 👋\n\nO(A) *${solicitante.nome}* gostaria de saber se você pode trocar de escala com ele(a) no dia *${dataFormatada}* (Ministério: ${turno.ministerio.nome}, Turno: ${turno.turno}).\n\nPor favor, entre em contato diretamente com o(a) ${solicitante.nome} para combinar.`;
        
        const notificadoComSucesso = await enviarNotificacaoTelegram(voluntarioAlvoId, mensagemDeTroca);
        
        if (notificadoComSucesso) {
            return `Ótima escolha! 👍\n\nJá enviei a solicitação de troca para o(a) **${voluntarioAlvo.nome}** via Telegram. Agora é só aguardar o contato dele(a).`;
        } else {
            return `Puxa! 😟 Tentei notificar o(a) **${voluntarioAlvo.nome}**, mas ele(a) ainda não cadastrou o Telegram no aplicativo. Tente entrar em contato por outro meio.`;
        }
    }

    static async setUnavailableFromBot(usuario, dataString) {
        if (!dataString) {
            return 'Por favor, diga a data que quer marcar como indisponível (formato AAAA-MM-DD).';
        }
        
        const dataUtc = new Date(dataString + 'T00:00:00');
        const registro = await Disponibilidade.findOne({ usuario: usuario.id, data: dataUtc });
        const dataFormatada = formatarDataCurta(dataUtc);
        
        if (registro) {
            return `Você já marcou o dia **${dataFormatada}** como indisponível.`;
        }

        await Disponibilidade.create({ usuario: usuario.id, data: dataUtc, status: 'Indisponível' });
        return `Ok! ✅ Marquei o dia **${dataFormatada}** como indisponível para você.`;
    }

    static async iniciarCriacaoDeEscala(usuario) {
        const liderancas = usuario.ministerios.filter(m => m.funcao === 'Líder' && m.status === 'Aprovado');
        if (liderancas.length === 0) {
            return { type: 'message', reply: "Parece que você não tem permissão de liderança em nenhum ministério para criar escalas." };
        }
        
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
}

module.exports = ChatbotService;