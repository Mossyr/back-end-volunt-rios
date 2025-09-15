// controllers/disponibilidade.controller.js
const Disponibilidade = require('../models/disponibilidade.model');
// LINHA ADICIONADA: Importa o modelo de Escala para consulta
const Escala = require('../models/escala.model');

/**
 * Adiciona ou remove a indisponibilidade de um usuário para uma data específica.
 * Se o usuário já estiver escalado para a data, retorna um status de conflito.
 */
exports.toggleDisponibilidade = async (req, res) => {
    const { data } = req.body; // data no formato 'YYYY-MM-DD'
    const usuarioId = req.user.id;

    if (!data) {
        return res.status(400).json({ msg: 'A data é obrigatória.' });
    }

    try {
        const registroExistente = await Disponibilidade.findOne({ usuario: usuarioId, data: data });

        if (registroExistente) {
            // Se já existe, o usuário está se tornando DISPONÍVEL, então apenas removemos.
            await Disponibilidade.findByIdAndDelete(registroExistente._id);
            res.json({ msg: 'Disponibilidade restaurada.', status: 'disponivel' });
        } else {
            // Se não existe, o usuário quer se tornar INDISPONÍVEL.
            // --- INÍCIO DA LÓGICA DE VERIFICAÇÃO DE CONFLITO ---
            
            // Primeiro, verificamos se o usuário já está em uma escala para este dia.
            const escalaExistente = await Escala.findOne({ usuario: usuarioId, data: data });

            // Se uma escala for encontrada, retornamos o status de conflito.
            if (escalaExistente) {
                return res.json({
                    msg: 'Usuário já está escalado para este dia. Não é possível marcar como indisponível.',
                    status: 'conflito_escala',
                    escalaId: escalaExistente._id // Enviamos o ID da escala para o front-end
                });
            }
            
            // --- FIM DA LÓGICA DE VERIFICAÇÃO DE CONFLITO ---

            // Se não houver conflito de escala, criamos o registro de indisponibilidade.
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
        // Mapeia para retornar apenas o array de strings de data, como o front-end espera.
        const datasIndisponiveis = indisponibilidades.map(item => item.data);
        res.json(datasIndisponiveis);
    } catch (error) {
        console.error("Erro em getMinhasDisponibilidades:", error);
        res.status(500).send('Erro no servidor.');
    }
};
