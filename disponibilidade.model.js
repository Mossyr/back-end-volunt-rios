// models/disponibilidade.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DisponibilidadeSchema = new Schema({
    usuario: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    data: { // Armazena a data em formato YYYY-MM-DD para facilitar a busca
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Indisponível'],
        required: true
    }
}, { timestamps: true });

// Garante que um usuário só pode ter um status por dia
DisponibilidadeSchema.index({ usuario: 1, data: 1 }, { unique: true });

module.exports = mongoose.model('Disponibilidade', DisponibilidadeSchema);