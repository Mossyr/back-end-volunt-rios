const Usuario = require('../models/usuario.model');
const Ministerio = require('../models/ministerio.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Registra um novo usuário
// @route   POST /api/auth/register
// @access  Público
exports.register = async (req, res) => {
  const { nome, sobrenome, celular, senha, ministeriosSelecionados } = req.body;
  try {
    let usuario = await Usuario.findOne({ celular });
    if (usuario) {
      return res.status(400).json({ msg: 'Este número de celular já está cadastrado.' });
    }
    usuario = new Usuario({ nome, sobrenome, celular, senha });
    const salt = await bcrypt.genSalt(10);
    usuario.senha = await bcrypt.hash(senha, salt);
    if (ministeriosSelecionados && ministeriosSelecionados.length > 0) {
        const ministeriosDocs = await Ministerio.find({ '_id': { $in: ministeriosSelecionados } });
        usuario.ministerios = ministeriosDocs.map(min => ({
            ministerio: min._id,
            funcao: 'Voluntário',
            status: 'Pendente'
        }));
    }
    await usuario.save();
    res.status(201).json({
      msg: 'Usuário registrado com sucesso! Aguardando aprovação do líder.',
      usuario: { id: usuario.id, nome: usuario.nome, celular: usuario.celular }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor.');
  }
};


// @desc    Autentica um usuário e retorna um token
// @route   POST /api/auth/login
// @access  Público
exports.login = async (req, res) => {
  const { nome, senha } = req.body;

  try {
    // 1. Verifica se o usuário existe pelo NOME
    const usuario = await Usuario.findOne({ nome });
    if (!usuario) {
      return res.status(400).json({ msg: 'Nome de usuário ou senha inválidos.' });
    }

    // 2. Compara a senha
    const isMatch = await bcrypt.compare(senha, usuario.senha);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Nome de usuário ou senha inválidos.' });
    }

    // 3. Cria o payload para o Token
    const payload = {
      user: {
        id: usuario.id,
      }
    };

    // 4. Gera e assina o Token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          userData: {
            id: usuario.id,
            nome: usuario.nome,
            sobrenome: usuario.sobrenome
          }
        });
      }
    );

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor');
  }
};


// --- FUNÇÃO ADICIONADA ---
// @desc    Pega os dados do usuário logado
// @route   GET /api/auth/me
// @access  Privado
exports.getMe = async (req, res) => {
  try {
    // O middleware 'protect' já colocou os dados do usuário em req.user
    // Apenas retornamos os dados dele, populando os nomes dos ministérios
    const user = await Usuario.findById(req.user.id).populate('ministerios.ministerio', 'nome');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro no servidor');
  }
};
