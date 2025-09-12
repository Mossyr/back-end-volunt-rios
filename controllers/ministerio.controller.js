const Ministerio = require('../models/ministerio.model');
// --- LINHA ADICIONADA ---
// Importa o modelo de Usuário para poder buscar os voluntários
const Usuario = require('../models/usuario.model');
// -----------------------

// Função para criar um novo ministério
exports.createMinisterio = async (req, res) => {
    const { nome, descricao } = req.body;

    try {
        let ministerio = await Ministerio.findOne({ nome });
        if (ministerio) {
            return res.status(400).json({ msg: 'Ministério já existe.' });
        }

        ministerio = new Ministerio({
            nome,
            descricao
        });

        await ministerio.save();
        res.status(201).json({ msg: 'Ministério criado com sucesso!', ministerio });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor.');
    }
};

// Função para listar todos os ministérios
exports.getAllMinisterios = async (req, res) => {
    try {
        const ministerios = await Ministerio.find().sort({ nome: 1 }); // Busca todos e ordena por nome
        res.json(ministerios);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor.');
    }
};


// --- NOVA FUNÇÃO ADICIONADA ---
// @desc    Busca todos os voluntários de um ministério específico
// @access  Líder do ministério
exports.getVoluntariosPorMinisterio = async (req, res) => {
    try {
        // Busca todos os usuários que pertencem ao ministério da URL e estão 'Aprovado'
        const voluntarios = await Usuario.find({
            'ministerios.ministerio': req.params.ministerioId,
            'ministerios.status': 'Aprovado'
        }).select('nome sobrenome'); // Retorna apenas nome e sobrenome para segurança e eficiência

        res.json(voluntarios);
    } catch (err) {
        console.error('Erro ao buscar voluntários do ministério:', err.message);
        res.status(500).send('Erro no servidor.');
    }
};
// -----------------------------