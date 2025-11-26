const mongoose = require('mongoose');
const { Schema } = mongoose;

const disponibilidadeSchema = new Schema({
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  },
  data: {
    type: Date, // Armazena o dia (sem hora, ou zerado)
    required: true,
  },
  // --- NOVOS CAMPOS ---
  tipo: {
    type: String,
    enum: ['Total', 'Parcial'],
    default: 'Total'
  },
  turnosIndisponiveis: [{
    type: String,
    enum: ['Manhã', 'Noite'] 
  }],
  // Se estiver vazio, significa que é para TODOS. Se tiver IDs, é só para esses.
  ministeriosAfetados: [{
    type: Schema.Types.ObjectId,
    ref: 'Ministerio'
  }],
  motivo: {
    type: String,
    trim: true,
    maxLength: 200
  }
}, {
  timestamps: true
});

// Garante que um usuário só tenha 1 documento de indisponibilidade por dia
disponibilidadeSchema.index({ usuario: 1, data: 1 }, { unique: true });

const Disponibilidade = mongoose.model('Disponibilidade', disponibilidadeSchema);

module.exports = Disponibilidade;