const Turno = require('../models/escala.model');
const Disponibilidade = require('../models/disponibilidade.model');
const Usuario = require('../models/usuario.model');

// ... (as outras funções do controller: createTurno, getTurnosPorMinisterio, etc. permanecem iguais) ...
exports.createTurno = async (req, res) => { // ou exports.criarTurno
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

// --- NOVA FUNÇÃO ADICIONADA ---
// @desc    Busca voluntários disponíveis para uma troca
// @route   GET /api/escalas/:turnoId/voluntarios-para-troca
// @access  Privado
exports.getVoluntariosParaTroca = async (req, res) => {
    try {
        // 1. Encontra a escala para a qual a troca está sendo solicitada
        const turno = await Turno.findById(req.params.turnoId);
        if (!turno) {
            return res.status(404).json({ msg: "Escala não encontrada." });
        }

        // 2. Formata a data da escala para o formato 'YYYY-MM-DD'
        const dataDoTurno = new Date(turno.data).toISOString().split('T')[0];

        // 3. Busca os IDs de todos os usuários que marcaram indisponibilidade na data do turno
        const indisponibilidades = await Disponibilidade.find({ data: dataDoTurno }).select('usuario');
        const idsIndisponiveis = indisponibilidades.map(i => i.usuario);

        // 4. Monta a lista de IDs a serem excluídos da busca:
        //    - O próprio usuário que está solicitando a troca (req.user.id)
        //    - Todos os voluntários que já estão na escala
        //    - Todos os voluntários que estão indisponíveis na data
        const idsExcluidos = [req.user.id, ...turno.voluntarios, ...idsIndisponiveis];

        // 5. Busca todos os voluntários elegíveis no banco
        const voluntariosElegiveis = await Usuario.find({
            '_id': { $nin: idsExcluidos }, // '$nin' significa "not in" (não está na lista)
            'ministerios.ministerio': turno.ministerio, // Do mesmo ministério da escala
            'ministerios.status': 'Aprovado' // Apenas voluntários aprovados
        }).select('nome sobrenome'); // Retorna apenas o nome e sobrenome

        res.json(voluntariosElegiveis);

    } catch (error) {
        console.error("Erro ao buscar voluntários para troca:", error);
        res.status(500).json({ msg: 'Erro no servidor ao processar a solicitação.' });
    }
};
// ----------------------------------------------------


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

        // Lógica de permissão: Apenas o criador pode editar
        if (turno.criado_por.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Não autorizado. Apenas o líder que criou a escala pode editá-la." });
        }
        
        turno.voluntarios = voluntarios;
        await turno.save();

        // Envia uma resposta JSON de sucesso
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

        // Nova lógica de permissão:
        const userId = req.user.id;
        const ministerioId = turno.ministerio; // Pega o ID do ministério da própria escala

        // Busca o usuário que está fazendo a requisição para checar suas permissões
        const usuario = await Usuario.findById(userId);
        
        // Verifica se o usuário tem a função de 'Líder' para o ministério específico da escala
        const isLeaderOfMinistry = usuario.ministerios.some(
            m => m.ministerio.equals(ministerioId) && m.funcao === 'Líder' && m.status === 'Aprovado'
        );

        // Se ele não for líder do ministério correto, nega o acesso
        if (!isLeaderOfMinistry) {
            return res.status(403).json({ msg: "Não autorizado. Você precisa ser um líder deste ministério para excluir a escala." });
        }

        // Se a permissão foi concedida, exclui a escala
        await turno.deleteOne();

        res.json({ msg: "Escala excluída com sucesso." });

    } catch (error) {
        console.error("Erro ao excluir turno:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};