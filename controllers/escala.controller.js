const Turno = require('../models/escala.model');
const Disponibilidade = require('../models/disponibilidade.model');
const Usuario = require('../models/usuario.model');
const Troca = require('../models/troca.model');
const Notification = require('../models/notification.model');

// --- FUNÇÃO AUXILIAR DE FORMATAÇÃO (O SEGREDO) ---
// Transforma o formato complexo do banco { usuario: { _id: 1, nome: 'A'}, role: 'X' }
// No formato simples que o front espera { _id: 1, nome: 'A', role: 'X' }
const formatarTurnoParaFront = (turno) => {
    if (!turno) return null;
    const turnoObj = turno.toObject ? turno.toObject() : turno;
    
    if (turnoObj.voluntarios && Array.isArray(turnoObj.voluntarios)) {
        turnoObj.voluntarios = turnoObj.voluntarios.map(v => {
            // Se o campo 'usuario' foi populado, a gente mescla ele com a role
            if (v.usuario && typeof v.usuario === 'object') {
                return { ...v.usuario, role: v.role };
            }
            return v;
        });
    }
    return turnoObj;
};

// --- MAPEAR ENTRADA ---
// Transforma o que vem do front [{ _id: 1, role: 'X' }]
// No que o banco espera [{ usuario: 1, role: 'X' }]
const mapearVoluntariosParaBanco = (listaVoluntarios) => {
    if (!Array.isArray(listaVoluntarios)) return [];
    return listaVoluntarios.map(v => {
        // Se for string (ID puro), vira objeto padrão
        if (typeof v === 'string') return { usuario: v, role: 'Voluntário' };
        // Se for objeto, mapeia _id para usuario
        return { usuario: v._id || v.usuario, role: v.role || 'Voluntário' };
    });
};


exports.createTurno = async (req, res) => {
  const { ministerioId, data, turno, voluntarios } = req.body;
  
  try {
    const dataFormatada = new Date(data).toISOString().split('T')[0];
    
    // Extrai apenas os IDs para checar disponibilidade
    const idsVoluntarios = voluntarios.map(v => (typeof v === 'string') ? v : v._id);

    const indisponiveis = await Disponibilidade.find({
        usuario: { $in: idsVoluntarios },
        data: dataFormatada
    }).populate('usuario', 'nome sobrenome');

    if (indisponiveis.length > 0) {
        const nomes = indisponiveis.map(i => `${i.usuario.nome} ${i.usuario.sobrenome}`).join(', ');
        return res.status(400).json({ msg: `Não foi possível criar a escala. Indisponíveis: ${nomes}.` });
    }

    const novoTurno = new Turno({
      ministerio: ministerioId, 
      data, 
      turno,
      // Usa a função de mapeamento para salvar a Role corretamente
      voluntarios: mapearVoluntariosParaBanco(voluntarios),
      criado_por: req.user.id,
    });
    
    const turnoSalvo = await novoTurno.save();
    res.status(201).json(turnoSalvo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Erro no servidor ao criar escala." });
  }
};

exports.getTurnosPorMinisterio = async (req, res) => {
    try {
        const turnos = await Turno.find({ ministerio: req.params.ministerioId })
            .populate('voluntarios.usuario', 'nome sobrenome') // Popula o campo aninhado
            .sort({ data: 1 });
            
        // Formata a lista para o front não quebrar
        const turnosFormatados = turnos.map(t => formatarTurnoParaFront(t));
        res.json(turnosFormatados);
    } catch (error) {
        console.error("Erro ao buscar turnos:", error);
        res.status(500).json({ msg: "Erro no servidor ao buscar escalas." });
    }
};

exports.getProximoTurno = async (req, res) => {
    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Busca onde o ID do usuário está dentro da lista de objetos 'voluntarios.usuario'
        const proximoTurno = await Turno.findOne({
            'voluntarios.usuario': req.user.id,
            data: { $gte: hoje }
        })
        .sort({ data: 1 })
        .populate('ministerio', 'nome');
        
        // Não precisa formatar complexo aqui pois a home usa dados simples, mas por segurança:
        res.json(formatarTurnoParaFront(proximoTurno));
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
            'voluntarios.usuario': req.user.id, // Ajuste na query
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

exports.getPublicEscalas = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.user.id).select('ministerios');
        if (!usuario) return res.status(404).json({ msg: 'Usuário não encontrado.' });
        
        const idsDosMeusMinisterios = usuario.ministerios
            .filter(m => m.status === 'Aprovado')
            .map(m => m.ministerio);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const escalasPublicas = await Turno.find({
            'ministerio': { $in: idsDosMeusMinisterios },
            'data': { $gte: hoje }
        })
        .sort({ data: 1 })
        .populate('ministerio', 'nome')
        .populate('voluntarios.usuario', 'nome'); // Popula aninhado

        res.json(escalasPublicas.map(t => formatarTurnoParaFront(t)));

    } catch (error) {
        console.error("Erro ao buscar escalas públicas:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};

exports.getTurnoById = async (req, res) => {
    try {
        const turno = await Turno.findById(req.params.turnoId)
            .populate('ministerio', 'nome')
            .populate('voluntarios.usuario', 'nome sobrenome');

        if (!turno) {
            return res.status(404).json({ msg: "Escala não encontrada." });
        }
        // Aqui a mágica acontece: O front recebe exatamente o que espera
        res.json(formatarTurnoParaFront(turno));
    } catch (error) {
        console.error("Erro ao buscar turno por ID:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};

exports.getVoluntariosParaTroca = async (req, res) => {
    try {
        const turno = await Turno.findById(req.params.turnoId);
        if (!turno) return res.status(404).json({ msg: "Escala não encontrada." });
        
        const dataDoTurno = new Date(turno.data).toISOString().split('T')[0];
        const indisponibilidades = await Disponibilidade.find({ data: dataDoTurno }).select('usuario');
        const idsIndisponiveis = indisponibilidades.map(i => i.usuario.toString());
        
        // Extrai IDs do formato novo
        const idsNaEscala = turno.voluntarios.map(v => v.usuario.toString());
        
        const idsExcluidos = [req.user.id, ...idsNaEscala, ...idsIndisponiveis];

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
    // Mantido igual, pois lida com IDs diretos de usuários na coleção de Trocas
    const { turnoId, destinatarioId } = req.body;
    const solicitanteId = req.user.id;

    try {
        const turno = await Turno.findById(turnoId);
        if (!turno) return res.status(404).json({ msg: "Escala não encontrada." });
        
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

        if (!turno) return res.status(404).json({ msg: "Escala não encontrada." });
        if (turno.criado_por.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Não autorizado." });
        }
        
        // Converte para o formato do banco antes de salvar
        turno.voluntarios = mapearVoluntariosParaBanco(voluntarios);
        
        await turno.save();
        res.json({ msg: 'Escala atualizada com sucesso!', turno: formatarTurnoParaFront(turno) });

    } catch (error) {
        console.error("Erro ao atualizar turno:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};

exports.deleteTurno = async (req, res) => {
    // Mantido igual
    try {
        const turno = await Turno.findById(req.params.turnoId);
        if (!turno) return res.status(404).json({ msg: "Escala não encontrada." });
        
        const userId = req.user.id;
        const ministerioId = turno.ministerio;
        const usuario = await Usuario.findById(userId);
        
        const isLeaderOfMinistry = usuario.ministerios.some(
            m => m.ministerio.equals(ministerioId) && m.funcao === 'Líder' && m.status === 'Aprovado'
        );

        if (!isLeaderOfMinistry) {
            return res.status(403).json({ msg: "Não autorizado." });
        }

        await turno.deleteOne();
        res.json({ msg: "Escala excluída com sucesso." });
        
    } catch (error) {
        console.error("Erro ao excluir turno:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};