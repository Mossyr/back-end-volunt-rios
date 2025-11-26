const mongoose = require('mongoose');
const { Schema } = mongoose;

const turnoSchema = new Schema({
  ministerio: {
    type: Schema.Types.ObjectId,
    ref: 'Ministerio',
    required: true,
  },
  data: {
    type: Date,
    required: true,
  },
  turno: {
    type: String,
    enum: ['Manhã', 'Noite'],
    required: true,
  },
  // --- MUDANÇA AQUI ---
  // Antes era só uma lista de IDs. Agora é uma lista de objetos com ID e ROLE.
  voluntarios: [{
    _id: false, // Evita criar um ID extra inútil para o sub-documento
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' },
    role: { type: String, default: 'Voluntário' } 
  }],
  // --------------------
  criado_por: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  }
}, {
  timestamps: true
});

const Turno = mongoose.model('Turno', turnoSchema, 'escalas');

module.exports = Turno;