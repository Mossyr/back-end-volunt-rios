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
  role: {
    type: String,
    enum: ['Usuario', 'Admin'],
    default: 'Usuario'
  },
  telegramChatId: {
    type: String,
    trim: true,
    unique: true, 
    sparse: true  
  },
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
  // ======================================================
  // --- CAMPOS ADICIONADOS PARA REDEFINIÇÃO DE SENHA ---
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  }
  // ======================================================
}, {
  timestamps: true 
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;