const Turno = require('../models/escala.model');
const Disponibilidade = require('../models/disponibilidade.model');
const Usuario = require('../models/usuario.model');
const Troca = require('../models/troca.model');
const Notification = require('../models/notification.model');

exports.createTurno = async (req, res) => {
  const { ministerioId, data, turno, voluntarios } = req.body;
  
  try {
    const dataFormatada = new Date(data).toISOString().split('T')[0];
    
    const indisponiveis = await Disponibilidade.find({
        usuario: { $in: voluntarios },
        data: dataFormatada
    }).populate('usuario', 'nome sobrenome');

    if (indisponiveis.length > 0) {
        const nomes = indisponiveis.map(i => `${i.usuario.nome} ${i.usuario.sobrenome}`).join(', ');
        return res.status(400).json({ msg: `Não foi possível criar a escala. O(s) seguinte(s) voluntário(s) estão indisponíveis nesta data: ${nomes}.` });
    }

    const novoTurno = new Turno({
      ministerio: ministerioId, 
      data, 
      turno,
      voluntarios,
      criado_por: req.user.id,
    });
    const turnoSalvo = await novoTurno.save();
    res.status(201).json(turnoSalvo);
  } catch (error) {
    res.status(500).json({ msg: "Erro no servidor ao criar escala." });
  }
};

exports.getTurnosPorMinisterio = async (req, res) => {
    try {
        const turnos = await Turno.find({ ministerio: req.params.ministerioId })
            .populate('voluntarios', 'nome sobrenome')
            .sort({ data: 1 });
        res.json(turnos);
    } catch (error) {
        console.error("Erro ao buscar turnos:", error);
        res.status(500).json({ msg: "Erro no servidor ao buscar escalas." });
    }
};

exports.getProximoTurno = async (req, res) => {
    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const proximoTurno = await Turno.findOne({
            voluntarios: req.user.id,
            data: { $gte: hoje }
        })
        .sort({ data: 1 })
        .populate('ministerio', 'nome');
        res.json(proximoTurno);
    } catch (error) {
        console.error("Erro ao buscar próximo turno:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};

exports.getMinhasEscalas = async (req, res) => {
    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const minhasEscalas = await Turno.find({
            voluntarios: req.user.id,
            data: { $gte: hoje }
        })
        .sort({ data: 1 })
        .populate('ministerio', 'nome');

        res.json(minhasEscalas);

    } catch (error) {
        console.error("Erro ao buscar minhas escalas:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};

exports.getTurnoById = async (req, res) => {
    try {
        const turno = await Turno.findById(req.params.turnoId)
            .populate('ministerio', 'nome')
            .populate('voluntarios', 'nome sobrenome');

        if (!turno) {
            return res.status(404).json({ msg: "Escala não encontrada." });
        }
        res.json(turno);
    } catch (error) {
        console.error("Erro ao buscar turno por ID:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};

exports.getVoluntariosParaTroca = async (req, res) => {
    try {
        const turno = await Turno.findById(req.params.turnoId);
        if (!turno) {
            return res.status(404).json({ msg: "Escala não encontrada." });
        }
        const dataDoTurno = new Date(turno.data).toISOString().split('T')[0];
        const indisponibilidades = await Disponibilidade.find({ data: dataDoTurno }).select('usuario');
        const idsIndisponiveis = indisponibilidades.map(i => i.usuario);
        const idsExcluidos = [req.user.id, ...turno.voluntarios, ...idsIndisponiveis];

        const voluntariosElegiveis = await Usuario.find({
            '_id': { $nin: idsExcluidos },
            'ministerios': {
                $elemMatch: { 
                    ministerio: turno.ministerio,
                    status: 'Aprovado'
                }
            }
        }).select('nome sobrenome');

        res.json(voluntariosElegiveis);

    } catch (error) {
        console.error("Erro ao buscar voluntários para troca:", error);
        res.status(500).json({ msg: 'Erro no servidor ao processar a solicitação.' });
    }
};

exports.solicitarTroca = async (req, res) => {
    // ===================================================================
    // --- CONSOLE LOG ADICIONADO PARA DEPURAÇÃO ---
    console.log(`[${new Date().toLocaleTimeString()}] ROTA /trocas/solicitar FOI ATINGIDA!`);
    console.log("Dados recebidos no body:", req.body);
    console.log("ID do usuário solicitante:", req.user.id);
    // ===================================================================

    const { turnoId, destinatarioId } = req.body;
    const solicitanteId = req.user.id;

    try {
        const turno = await Turno.findById(turnoId);
        if (!turno) {
            return res.status(404).json({ msg: "Escala não encontrada." });
        }
        const dataFormatada = new Date(turno.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

        const novaTroca = new Troca({
            turno: turnoId,
            solicitante: solicitanteId,
            destinatario: destinatarioId
        });
        await novaTroca.save();

        const solicitante = await Usuario.findById(solicitanteId).select('nome');
        await Notification.create({
            user: destinatarioId,
            type: 'SWAP_REQUEST',
            fromUser: solicitanteId,
            message: `<strong>${solicitante.nome}</strong> quer trocar a escala do dia <strong>${dataFormatada}</strong> com você.`,
            relatedId: novaTroca._id
        });

        res.status(201).json({ msg: 'Solicitação de troca enviada com sucesso!' });

    } catch (error) {
        console.error("Erro ao solicitar troca:", error);
        res.status(500).json({ msg: 'Erro no servidor ao processar a solicitação.' });
    }
};

exports.updateTurno = async (req, res) => {
    const { voluntarios } = req.body;

    if (!voluntarios || !Array.isArray(voluntarios)) {
        return res.status(400).json({ msg: 'A lista de voluntários é inválida.' });
    }

    try {
        const turno = await Turno.findById(req.params.turnoId);

        if (!turno) {
            return res.status(404).json({ msg: "Escala não encontrada." });
        }
        if (turno.criado_por.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Não autorizado. Apenas o líder que criou a escala pode editá-la." });
        }
        
        turno.voluntarios = voluntarios;
        await turno.save();
        res.json({ msg: 'Escala atualizada com sucesso!', turno });

    } catch (error) {
        console.error("Erro ao atualizar turno:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};

exports.deleteTurno = async (req, res) => {
    try {
        const turno = await Turno.findById(req.params.turnoId);
        if (!turno) {
            return res.status(404).json({ msg: "Escala não encontrada." });
        }
        const userId = req.user.id;
        const ministerioId = turno.ministerio;
        const usuario = await Usuario.findById(userId);
        
        const isLeaderOfMinistry = usuario.ministerios.some(
            m => m.ministerio.equals(ministerioId) && m.funcao === 'Líder' && m.status === 'Aprovado'
        );

        if (!isLeaderOfMinistry) {
            return res.status(403).json({ msg: "Não autorizado. Você precisa ser um líder deste ministério para excluir a escala." });
        }

        await turno.deleteOne();
        res.json({ msg: "Escala excluída com sucesso." });
        
    } catch (error) {
        console.error("Erro ao excluir turno:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};