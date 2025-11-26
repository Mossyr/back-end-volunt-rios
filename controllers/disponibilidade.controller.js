const Disponibilidade = require('../models/disponibilidade.model');
const Turno = require('../models/escala.model');

// Lista indisponibilidades do usuário (GET)
exports.getMyDisponibilidade = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const indisponibilidades = await Disponibilidade.find({
            usuario: req.user.id,
            data: { $gte: today }
        });
        
        res.json(indisponibilidades);
    } catch (error) {
        console.error("Erro ao buscar disponibilidade:", error);
        res.status(500).json({ msg: 'Erro ao buscar disponibilidades.' });
    }
};

// Salvar ou Atualizar Indisponibilidade (POST)
exports.saveDisponibilidade = async (req, res) => {
    const { data, turnos, ministerios, motivo } = req.body;

    try {
        // Validar Data
        const dataObj = new Date(data);
        if (isNaN(dataObj.getTime())) {
            return res.status(400).json({ msg: "Data inválida." });
        }

        const startOfDay = new Date(dataObj); startOfDay.setUTCHours(0,0,0,0);
        const endOfDay = new Date(dataObj); endOfDay.setUTCHours(23,59,59,999);

        // Busca escalas desse usuário nesse dia para verificar conflito
        const conflitos = await Turno.find({
            'voluntarios.usuario': req.user.id, // Nota: Ajustado para o novo schema de usuario
            data: { $gte: startOfDay, $lte: endOfDay }
        }).populate('ministerio', 'nome');

        // Validação de conflito inteligente
        for (let escala of conflitos) {
            const conflitoTurno = turnos.includes(escala.turno);
            // Se ministerios for vazio (todos) OU incluir o ministerio da escala
            const conflitoMinisterio = ministerios.length === 0 || ministerios.includes(escala.ministerio._id.toString());

            if (conflitoTurno && conflitoMinisterio) {
                return res.status(409).json({ 
                    msg: `Conflito! Você já está escalado no ministério ${escala.ministerio.nome} (${escala.turno}).`,
                    escalaId: escala._id 
                });
            }
        }

        // Se passou, salva ou atualiza (upsert)
        const filtro = { usuario: req.user.id, data: data };
        const update = {
            turnosIndisponiveis: turnos,
            ministeriosAfetados: ministerios,
            motivo: motivo,
            tipo: (turnos.length < 2 && ministerios.length > 0) ? 'Parcial' : 'Total'
        };

        await Disponibilidade.findOneAndUpdate(filtro, update, { upsert: true, new: true });

        res.json({ msg: 'Indisponibilidade salva com sucesso.' });

    } catch (error) {
        console.error("Erro ao salvar disponibilidade:", error);
        res.status(500).json({ msg: 'Erro ao salvar.' });
    }
};

// Remover Indisponibilidade (DELETE)
exports.deleteDisponibilidade = async (req, res) => {
    try {
        const { data } = req.body;
        await Disponibilidade.findOneAndDelete({ usuario: req.user.id, data: data });
        res.json({ msg: 'Disponibilidade removida.' });
    } catch (error) {
        console.error("Erro ao remover disponibilidade:", error);
        res.status(500).json({ msg: 'Erro ao remover.' });
    }
};