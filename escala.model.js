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
  // CAMPOS DE HORA REMOVIDOS E CAMPO DE TURNO ADICIONADO
  turno: {
    type: String,
    enum: ['Manhã', 'Noite'],
    required: true,
  },
  voluntarios: [{
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
  }],
  criado_por: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  }
}, {
  timestamps: true
});

const Turno = mongoose.model('Turno', turnoSchema);

module.exports = Turno;