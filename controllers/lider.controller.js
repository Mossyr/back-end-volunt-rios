// controllers/lider.controller.js
const Usuario = require('../models/usuario.model');
const Ministerio = require('../models/ministerio.model');
const Disponibilidade = require('../models/disponibilidade.model');

// Função para listar voluntários pendentes de um ministério
exports.getPendingVolunteers = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const pendingUsers = await Usuario.find({
            'ministerios.ministerio': ministerioId,
            'ministerios.status': 'Pendente'
        }).select('nome sobrenome');
        res.json(pendingUsers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor.');
    }
};

// Função para aprovar um voluntário
exports.approveVolunteer = async (req, res) => {
    try {
        const { voluntarioId, ministerioId } = req.body;
        const voluntario = await Usuario.findById(voluntarioId);
        if (!voluntario) {
            return res.status(404).json({ msg: 'Voluntário não encontrado.' });
        }
        const ministryIndex = voluntario.ministerios.findIndex(
            m => m.ministerio.toString() === ministerioId
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

// --- FUNÇÃO CORRIGIDA ---
// @desc    Busca todos os voluntários aprovados de um ministério, filtrando por data se informado
// @route   GET /api/lider/voluntarios/:ministerioId?data=YYYY-MM-DD
// @access  Líder
exports.getApprovedVolunteers = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const { data } = req.query; // Ex: '2025-08-11'

        // Define a consulta base para encontrar voluntários aprovados no ministério.
        const query = {
            'ministerios.ministerio': ministerioId,
            'ministerios.status': 'Aprovado'
        };

        // Se uma data foi informada, precisamos filtrar os indisponíveis.
        if (data) {
            // Encontra todos os registros de indisponibilidade para a data específica.
            const indisponiveis = await Disponibilidade.find({ data: data }).select('usuario');
            
            // Extrai apenas os IDs dos usuários indisponíveis.
            const idsIndisponiveis = indisponiveis.map(item => item.usuario);

            // Adiciona uma condição à consulta principal para EXCLUIR os IDs dos usuários indisponíveis.
            // O operador '$nin' significa "not in" (não está na lista).
            if (idsIndisponiveis.length > 0) {
                query._id = { $nin: idsIndisponiveis };
            }
        }

        // Executa a consulta final, já com o filtro de disponibilidade (se aplicável).
        const voluntariosDisponiveis = await Usuario.find(query).select('nome sobrenome');

        res.json(voluntariosDisponiveis);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor.');
    }
};