const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define a estrutura (schema) para os usuários
const usuarioSchema = new Schema({
  nome: {
    type: String,
    required: [true, 'O nome é obrigatório.'],
    trim: true
  },
  sobrenome: {
    type: String,
    required: [true, 'O sobrenome é obrigatório.'],
    trim: true
  },
  celular: {
    type: String,
    required: [true, 'O celular é obrigatório.'],
    unique: true,
    trim: true
  },
  senha: {
    type: String,
    required: [true, 'A senha é obrigatória.'],
  },
  // --- CAMPO DE ROLE ADICIONADO ---
  role: {
    type: String,
    enum: ['Usuario', 'Admin'],
    default: 'Usuario'
  },
  // --- CAMPO ADICIONADO PARA O TELEGRAM ---
  telegramChatId: {
    type: String,
    trim: true,
    unique: true, // Garante que um ID do Telegram só pode ser usado por um usuário
    sparse: true  // Permite valores nulos (nem todos os usuários terão o Telegram conectado)
  },
  // Estrutura para armazenar os ministérios e as funções do usuário
  ministerios: [{
    ministerio: {
      type: Schema.Types.ObjectId,
      ref: 'Ministerio'
    },
    funcao: {
      type: String,
      enum: ['Voluntário', 'Líder'],
      default: 'Voluntário'
    },
    status: {
        type: String,
        enum: ['Pendente', 'Aprovado'],
        default: 'Pendente'
    }
  }],
}, {
  timestamps: true // Cria automaticamente os campos createdAt e updatedAt
});

// Cria o modelo 'Usuario' a partir do schema
const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;