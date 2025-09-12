const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model'); // Verifique se o caminho do model está correto

/**
 * @desc Middleware para proteger rotas, verificando o token JWT.
 */
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Pega o token do cabeçalho
      token = req.headers.authorization.split(' ')[1];

      // Verifica se o token é válido
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // CORREÇÃO CRÍTICA AQUI: Usando a estrutura correta do seu token (decoded.user.id)
      req.user = await Usuario.findById(decoded.user.id).select('-senha');

      if (!req.user) {
        return res.status(401).json({ msg: 'Usuário do token não encontrado.' });
      }
      
      next(); // Passa para a próxima função
    } catch (error) {
      console.error(error);
      return res.status(401).json({ msg: 'Não autorizado, token falhou' });
    }
  }

  if (!token) {
    return res.status(401).json({ msg: 'Não autorizado, sem token' });
  }
};


/**
 * @desc Middleware para verificar se o usuário é um líder aprovado do ministério em questão.
 */
exports.isLeader = (req, res, next) => {
    // LÓGICA CORRIGIDA AQUI: Verifica o ID do ministério tanto na URL (params) quanto no corpo (body) da requisição
    const ministerioIdFromParams = req.params.ministerioId;
    const ministerioIdFromBody = req.body.ministerioId;
    
    const targetMinisterioId = ministerioIdFromParams || ministerioIdFromBody;

    if (!targetMinisterioId) {
        return res.status(400).json({ msg: 'ID do Ministério não fornecido para verificação de permissão.' });
    }

    // Verifica se o usuário logado (anexado pelo middleware 'protect') tem a função 'Líder' para o ministério
    const leadershipRole = req.user.ministerios.find(
        m => m.ministerio.toString() === targetMinisterioId.toString()
    );

    if (leadershipRole && leadershipRole.funcao === 'Líder' && leadershipRole.status === 'Aprovado') {
        next(); // Se for líder aprovado, pode prosseguir
    } else {
        res.status(403).json({ msg: 'Acesso negado. Você não é um líder aprovado para este ministério.' });
    }
};