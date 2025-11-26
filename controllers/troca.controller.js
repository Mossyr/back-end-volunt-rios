// controllers/troca.controller.js

const Troca = require('../models/troca.model');
const Turno = require('../models/escala.model'); 
const Usuario = require('../models/usuario.model'); 
// Assumindo que você tem o NotificationController importado corretamente:
const NotificationController = require('./notification.controller'); 

// @desc    Obtém os detalhes de uma solicitação de troca
exports.getTrocaDetails = async (req, res) => {
    try {
        const troca = await Troca.findById(req.params.trocaId)
            .populate({
                path: 'turno',
                // Garante que o turno está populado com o ministério para exibição
                populate: { path: 'ministerio', select: 'nome' } 
            })
            .populate('solicitante', 'nome sobrenome')
            .populate('destinatario', 'nome sobrenome');

        if (!troca) {
            return res.status(404).json({ msg: "Solicitação de troca não encontrada." });
        }
        
        // Simples verificação de acesso
        if (troca.solicitante._id.toString() !== req.user.id && troca.destinatario._id.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Não autorizado a visualizar esta troca." });
        }

        res.json(troca);

    } catch (error) {
        console.error("Erro ao buscar detalhes da troca:", error);
        res.status(500).json({ msg: "Erro no servidor ao buscar detalhes da troca." });
    }
};

// @desc    Aceita uma solicitação de troca (IMPLEMENTADO)
exports.aceitarTroca = async (req, res) => {
    const { trocaId } = req.body;
    const userId = req.user.id; // Usuário logado que está aceitando

    try {
        const troca = await Troca.findById(trocaId);

        if (!troca) {
            return res.status(404).json({ msg: "Solicitação de troca não encontrada." });
        }
        if (troca.destinatario.toString() !== userId) {
            return res.status(403).json({ msg: "Você não é o destinatário desta troca e não pode aceitá-la." });
        }
        if (troca.status !== 'pendente') {
            return res.status(400).json({ msg: `Esta troca já foi ${troca.status}.` });
        }

        // 1. Encontrar o turno e atualizar os voluntários
        const turno = await Turno.findById(troca.turno).populate('ministerio', 'nome');
        if (!turno) {
            return res.status(404).json({ msg: "Turno da troca não encontrado. Escala ausente." });
        }

        // Regra de Ouro:
        // A) Remove o Solicitante (quem ofereceu a escala)
        turno.voluntarios = turno.voluntarios.filter(v => v.toString() !== troca.solicitante.toString());
        // B) Adiciona o Destinatário (quem aceitou a escala)
        turno.voluntarios.push(troca.destinatario);
        await turno.save();

        // 2. Atualizar o status da solicitação de troca
        troca.status = 'aceita';
        troca.data_resposta = Date.now();
        await troca.save();

        // 3. Notificar o solicitante (quem ofereceu a troca)
        const solicitante = await Usuario.findById(troca.solicitante);
        const destinatario = await Usuario.findById(troca.destinatario);
        
        const dataFormatada = new Date(turno.data).toLocaleDateString('pt-BR');
        
        // Notificação In-App
        await NotificationController.createNotification(
            solicitante._id,
            'SWAP_INFO',
            `Sua solicitação de troca com <strong>${destinatario.nome}</strong> para o turno de <strong>${turno.ministerio.nome}</strong> no dia <strong>${dataFormatada}</strong> foi <strong>ACEITA</strong>.`,
            troca._id,
            destinatario._id // De quem veio a resposta
        );
        
        // Notificação Telegram
        const msgTelegram = `✅ *TROCA ACEITA!* ✅\n\nO voluntário *${destinatario.nome}* aceitou sua solicitação de troca.`;
        await NotificationController.enviarNotificacaoTelegram(solicitante._id, msgTelegram);


        res.status(200).json({ msg: "Troca aceita com sucesso! A escala foi atualizada." });

    } catch (error) {
        console.error("Erro ao aceitar troca:", error);
        res.status(500).json({ msg: "Erro no servidor ao aceitar a troca." });
    }
};

// @desc    Recusa uma solicitação de troca (IMPLEMENTADO)
exports.recusarTroca = async (req, res) => {
    const { trocaId } = req.body;
    const userId = req.user.id; // Usuário logado que está recusando

    try {
        const troca = await Troca.findById(trocaId);

        if (!troca) {
            return res.status(404).json({ msg: "Solicitação de troca não encontrada." });
        }
        if (troca.destinatario.toString() !== userId) {
            return res.status(403).json({ msg: "Você não é o destinatário desta troca e não pode recusá-la." });
        }
        if (troca.status !== 'pendente') {
            return res.status(400).json({ msg: `Esta troca já foi ${troca.status}.` });
        }

        // 1. Atualizar o status da solicitação de troca
        troca.status = 'recusada';
        troca.data_resposta = Date.now();
        await troca.save();

        // 2. Notificar o solicitante
        const solicitante = await Usuario.findById(troca.solicitante);
        const destinatario = await Usuario.findById(troca.destinatario);
        const escalaAfetada = await Turno.findById(troca.turno).populate('ministerio', 'nome');

        const dataFormatada = new Date(escalaAfetada.data).toLocaleDateString('pt-BR');

        // Notificação In-App
        await NotificationController.createNotification(
            solicitante._id,
            'SWAP_INFO',
            `Sua solicitação de troca com <strong>${destinatario.nome}</strong> para o turno de <strong>${escalaAfetada.ministerio.nome}</strong> no dia <strong>${dataFormatada}</strong> foi <strong>RECUSADA</strong>.`,
            troca._id,
            destinatario._id
        );

        // Notificação Telegram
        const msgTelegram = `❌ *TROCA RECUSADA!* ❌\n\nO voluntário *${destinatario.nome}* recusou sua solicitação de troca.`;
        await NotificationController.enviarNotificacaoTelegram(solicitante._id, msgTelegram);


        res.status(200).json({ msg: "Troca recusada com sucesso." });

    } catch (error) {
        console.error("Erro ao recusar troca:", error);
        res.status(500).json({ msg: "Erro no servidor ao recusar a troca." });
    }
};