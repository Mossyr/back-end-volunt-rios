// controllers/disponibilidade.controller.js
const Disponibilidade = require('../models/disponibilidade.model');
const Escala = require('../models/escala.model');

/**
 * Adiciona ou remove a indisponibilidade de um usuário para uma data específica.
 * Se o usuário já estiver escalado para a data, retorna um status de conflito.
 */
exports.toggleDisponibilidade = async (req, res) => {
    const { data } = req.body; // data string no formato 'YYYY-MM-DD'
    const usuarioId = req.user.id;

    if (!data) {
        return res.status(400).json({ msg: 'A data é obrigatória.' });
    }

    try {
        const registroExistente = await Disponibilidade.findOne({ usuario: usuarioId, data: data });

        if (registroExistente) {
            await Disponibilidade.findByIdAndDelete(registroExistente._id);
            res.json({ msg: 'Disponibilidade restaurada.', status: 'disponivel' });
        } else {
            const inicioDoDia = new Date(data);
            inicioDoDia.setUTCHours(0, 0, 0, 0);

            const fimDoDia = new Date(data);
            fimDoDia.setUTCHours(23, 59, 59, 999);

            // --- CORREÇÃO APLICADA AQUI ---
            // Trocamos 'usuario: usuarioId' por 'voluntarios: usuarioId'
            const escalaExistente = await Escala.findOne({
                voluntarios: usuarioId, // Agora busca o ID do usuário DENTRO do array 'voluntarios'
                data: {
                    $gte: inicioDoDia,
                    $lte: fimDoDia
                }
            });
            // --- FIM DA CORREÇÃO ---

            if (escalaExistente) {
                return res.status(409).json({ // Usando status 409 (Conflict) para ser mais semântico
                    msg: 'Você já está escalado para este dia e não pode marcar como indisponível.',
                    status: 'conflito_escala',
                    escalaId: escalaExistente._id
                });
            }

            const novaIndisponibilidade = new Disponibilidade({
                usuario: usuarioId,
                data: data,
                status: 'Indisponível'
            });
            await novaIndisponibilidade.save();
            res.status(201).json({ msg: 'Data marcada como indisponível.', status: 'indisponivel' });
        }
    } catch (error) {
        console.error("Erro em toggleDisponibilidade:", error);
        res.status(500).send('Erro no servidor.');
    }
};

/**
 * Busca todas as datas que o usuário logado marcou como indisponível.
 */
exports.getMinhasDisponibilidades = async (req, res) => {
    try {
        const indisponibilidades = await Disponibilidade.find({ usuario: req.user.id });
        const datasIndisponiveis = indisponibilidades.map(item => item.data);
        res.json(datasIndisponiveis);
    } catch (error) {
        console.error("Erro em getMinhasDisponibilidades:", error);
        res.status(500).send('Erro no servidor.');
    }
};
