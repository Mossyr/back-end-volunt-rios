// controllers/lider.controller.js
const Usuario = require('../models/usuario.model');
const Ministerio = require('../models/ministerio.model');
const Disponibilidade = require('../models/disponibilidade.model');
const Turno = require('../models/escala.model'); // Adicionado para buscar as escalas

// Função para listar voluntários pendentes de um ministério
exports.getPendingVolunteers = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const pendingUsers = await Usuario.find({
            'ministerios': {
                $elemMatch: {
                    ministerio: ministerioId,
                    status: 'Pendente'
                }
            }
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

// Função para buscar voluntários aprovados de um ministério
exports.getApprovedVolunteers = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const { data } = req.query;
        const query = {
            'ministerios': { $elemMatch: { ministerio: ministerioId, status: 'Aprovado' } }
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

// ===================================================================
// --- NOVA FUNÇÃO ADICIONADA PARA O DASHBOARD DO LÍDER ---
// ===================================================================
exports.getDashboardData = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const user = req.user; // O middleware 'protect' já nos dá o usuário

        // Garante que o usuário logado é líder do ministério que está tentando acessar
        const isLeaderOfMinistry = user.ministerios.some(
            m => m.ministerio.equals(ministerioId) && m.funcao === 'Líder' && m.status === 'Aprovado'
        );

        if (!isLeaderOfMinistry) {
            return res.status(403).json({ msg: "Acesso não autorizado a este painel de ministério." });
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Busca todos os dados necessários para o dashboard em paralelo
        const [ministerio, proximasEscalas, todosVoluntarios] = await Promise.all([
            Ministerio.findById(ministerioId).select('nome'),
            Turno.find({ ministerio: ministerioId, data: { $gte: hoje } }).sort({ data: 1 }).populate('voluntarios', 'nome'),
            Usuario.find({ 
                'ministerios': { $elemMatch: { ministerio: ministerioId, status: 'Aprovado' } } 
            }).select('nome sobrenome')
        ]);

        res.json({ ministerio, proximasEscalas, todosVoluntarios });

    } catch (error) {
        console.error("Erro ao buscar dados do dashboard do líder:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};