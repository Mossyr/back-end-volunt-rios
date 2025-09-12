// controllers/disponibilidade.controller.js
const Disponibilidade = require('../models/disponibilidade.model');

// Adiciona ou remove a indisponibilidade de um usuário para uma data específica
exports.toggleDisponibilidade = async (req, res) => {
    const { data } = req.body; // data no formato 'YYYY-MM-DD'
    const usuarioId = req.user.id;

    if (!data) {
        return res.status(400).json({ msg: 'A data é obrigatória.' });
    }

    try {
        const registroExistente = await Disponibilidade.findOne({ usuario: usuarioId, data: data });

        if (registroExistente) {
            // Se já existe, remove o registro para o usuário ficar disponível
            await Disponibilidade.findByIdAndDelete(registroExistente._id);
            res.json({ msg: 'Disponibilidade restaurada.', status: 'disponivel' });
        } else {
            // Se não existe, cria o registro de indisponibilidade
            const novaIndisponibilidade = new Disponibilidade({
                usuario: usuarioId,
                data: data,
                status: 'Indisponível'
            });
            await novaIndisponibilidade.save();
            res.status(201).json({ msg: 'Data marcada como indisponível.', status: 'indisponivel' });
        }
    } catch (error) {
        res.status(500).send('Erro no servidor.');
    }
};

// Busca todas as datas que o usuário marcou como indisponível
exports.getMinhasDisponibilidades = async (req, res) => {
    try {
        const indisponibilidades = await Disponibilidade.find({ usuario: req.user.id });
        const datasIndisponiveis = indisponibilidades.map(item => item.data);
        res.json(datasIndisponiveis);
    } catch (error) {
        res.status(500).send('Erro no servidor.');
    }
};