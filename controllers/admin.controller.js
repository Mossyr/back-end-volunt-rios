// controllers/admin.controller.js
const Usuario = require('../models/usuario.model');
const mongoose = require('mongoose');

exports.getTodosUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find().select('-senha')
            .populate('ministerios.ministerio', 'nome'); 
        
        res.json(usuarios);
    } catch (error) {
        console.error("Erro ao buscar usuários para o painel de admin:", error);
        res.status(500).send('Erro no servidor');
    }
};

/**
 * @desc    Atualiza a lista de ministérios de um usuário. (VERSÃO ATUALIZADA)
 * @route   PUT /api/admin/usuarios/:userId/ministerios
 * @access  Admin
 */
exports.atualizarMinisteriosUsuario = async (req, res) => {
    const { userId } = req.params;
    const { ministerios: novosMinisteriosInfo } = req.body; 

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'ID de usuário inválido.' });
    }

    try {
        const usuario = await Usuario.findById(userId);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuário não encontrado.' });
        }

        // AGORA, em vez de usar valores padrão, usamos o que veio do frontend
        const ministeriosFormatados = novosMinisteriosInfo.map(m => ({
            ministerio: m.ministerioId,
            funcao: m.funcao, // Usa a função enviada
            status: m.status  // Usa o status enviado
        }));
        
        usuario.ministerios = ministeriosFormatados;
        await usuario.save();
        
        const usuarioAtualizado = await Usuario.findById(userId).select('-senha').populate('ministerios.ministerio', 'nome');

        res.json({ msg: 'Ministérios do usuário atualizados com sucesso.', usuario: usuarioAtualizado });

    } catch (error) {
        console.error("Erro ao atualizar ministérios do usuário:", error);
        res.status(500).send('Erro no servidor');
    }
};