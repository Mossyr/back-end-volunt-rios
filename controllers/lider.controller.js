// controllers/lider.controller.js
const mongoose = require('mongoose'); // <--- IMPORTANTE: Adicionei isso
const Usuario = require('../models/usuario.model');
const Ministerio = require('../models/ministerio.model');
const Disponibilidade = require('../models/disponibilidade.model');
const Turno = require('../models/escala.model'); 

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

// ===================================================================
// --- FUNÇÃO BLINDADA V2: AGORA COM VALIDAÇÃO DE OBJECTID ---
// ===================================================================
exports.getApprovedVolunteers = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const { data } = req.query; // Data vem como string 'YYYY-MM-DD'
        
        // Query base: Usuários aprovados neste ministério
        const query = {
            'ministerios': { $elemMatch: { ministerio: ministerioId, status: 'Aprovado' } }
        };

        let idsBloqueados = [];

        if (data) {
            // Validação de Data
            const dateObj = new Date(data);
            if (isNaN(dateObj.getTime())) {
                return res.status(400).json({ msg: "Data inválida." });
            }

            // 1. INDISPONIBILIDADE MANUAL
            const indisponiveis = await Disponibilidade.find({ data: data }).select('usuario');
            const idsIndisponiveisManual = indisponiveis.map(item => item.usuario.toString());
            idsBloqueados = [...idsBloqueados, ...idsIndisponiveisManual];

            // 2. CONFLITO DE AGENDA (JÁ ESCALADO)
            const startOfDay = new Date(data);
            startOfDay.setUTCHours(0, 0, 0, 0);
            
            const endOfDay = new Date(data);
            endOfDay.setUTCHours(23, 59, 59, 999);

            const escalasDoDia = await Turno.find({
                data: { $gte: startOfDay, $lte: endOfDay }
            }).select('voluntarios');

            // Extração ULTRA SEGURA de IDs
            escalasDoDia.forEach(escala => {
                if (escala.voluntarios && Array.isArray(escala.voluntarios)) {
                    escala.voluntarios.forEach(v => {
                        try {
                            // Caso 1: Novo Schema (v é objeto com propriedade .usuario)
                            if (v && v.usuario && mongoose.Types.ObjectId.isValid(v.usuario)) {
                                idsBloqueados.push(v.usuario.toString());
                            } 
                            // Caso 2: Velho Schema (v é o próprio ID)
                            else if (v && mongoose.Types.ObjectId.isValid(v)) {
                                idsBloqueados.push(v.toString());
                            }
                            // Caso 3: Lixo (ex: objeto sem usuario) -> IGNORA SILENCIOSAMENTE
                        } catch (e) {
                            // Ignora erros de parse individual
                        }
                    });
                }
            });

            // Remove duplicatas
            idsBloqueados = [...new Set(idsBloqueados)];
        }

        // Se houver bloqueados, aplica o filtro
        if (idsBloqueados.length > 0) {
            query._id = { $nin: idsBloqueados };
        }

        const voluntariosDisponiveis = await Usuario.find(query).select('nome sobrenome');
        res.json(voluntariosDisponiveis);

    } catch (err) {
        console.error("Erro CRÍTICO ao buscar voluntários:", err);
        res.status(500).json({ msg: 'Erro no servidor ao buscar voluntários.' });
    }
};

// Função para o Dashboard
exports.getDashboardData = async (req, res) => {
    try {
        const { ministerioId } = req.params;
        const user = req.user;

        if (!ministerioId || !mongoose.Types.ObjectId.isValid(ministerioId)) {
             return res.status(400).json({ msg: "ID do ministério inválido." });
        }

        const isLeaderOfMinistry = user.ministerios.some(
            m => m.ministerio.equals(ministerioId) && m.funcao === 'Líder' && m.status === 'Aprovado'
        );

        if (!isLeaderOfMinistry) {
            return res.status(403).json({ msg: "Acesso não autorizado." });
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const [ministerio, proximasEscalas, todosVoluntarios] = await Promise.all([
            Ministerio.findById(ministerioId).select('nome'),
            Turno.find({ ministerio: ministerioId, data: { $gte: hoje } }).sort({ data: 1 }).populate('voluntarios.usuario', 'nome'),
            Usuario.find({ 
                'ministerios': { $elemMatch: { ministerio: ministerioId, status: 'Aprovado' } } 
            }).select('nome sobrenome')
        ]);

        if (!ministerio) return res.status(404).json({ msg: "Ministério não encontrado." });

        res.json({ ministerio, proximasEscalas, todosVoluntarios });

    } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        res.status(500).json({ msg: "Erro no servidor." });
    }
};