// controllers/lider.controller.js
const Usuario = require('../models/usuario.model');
const Ministerio = require('../models/ministerio.model');
const Disponibilidade = require('../models/disponibilidade.model');

// ===================================================================
// --- FUNÇÃO CORRIGIDA ---
// Função para listar voluntários pendentes de um ministério
exports.getPendingVolunteers = async (req, res) => {
    try {
        const { ministerioId } = req.params;

        // A busca agora usa $elemMatch para garantir que o status 'Pendente'
        // corresponde EXATAMENTE ao ministério que está sendo consultado.
        const pendingUsers = await Usuario.find({
            'ministerios': {
                $elemMatch: {
                    ministerio: ministerioId,
                    status: 'Pendente'
                }
            }
        }).select('nome sobrenome'); // Retorna apenas nome e sobrenome

        res.json(pendingUsers);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor.');
    }
};
// ===================================================================

// Função para aprovar um voluntário
exports.approveVolunteer = async (req, res) => {
    try {
        const { voluntarioId, ministerioId } = req.body;
        const voluntario = await Usuario.findById(voluntarioId);
        if (!voluntario) {
            return res.status(404).json({ msg: 'Voluntário não encontrado.' });
        }
        // Correção aqui também: garante que está aprovando um voluntário realmente pendente.
        const ministryIndex = voluntario.ministerios.findIndex(
            m => m.ministerio.toString() === ministerioId && m.status === 'Pendente'
        );
        if (ministryIndex === -1) {
            return res.status(404).json({ msg: 'Voluntário não está pendente neste ministério.' });
        }
        voluntario.ministerios[ministryIndex].status = 'Aprovado';
        await voluntario.save();
        res.json({ msg: 'Voluntário aprovado com sucesso!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor.');
    }
};

// @desc    Busca todos os voluntários aprovados de um ministério, filtrando por data se informado
// @route   GET /api/lider/voluntarios/:ministerioId?data=YYYY-MM-DD
// @access  Líder
exports.getApprovedVolunteers = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const { data } = req.query;

        const query = {
            'ministerios.ministerio': ministerioId,
            'ministerios.status': 'Aprovado'
        };

        if (data) {
            const indisponiveis = await Disponibilidade.find({ data: data }).select('usuario');
            const idsIndisponiveis = indisponiveis.map(item => item.usuario);

            if (idsIndisponiveis.length > 0) {
                query._id = { $nin: idsIndisponiveis };
            }
        }

        const voluntariosDisponiveis = await Usuario.find(query).select('nome sobrenome');

        res.json(voluntariosDisponiveis);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor.');
    }
};