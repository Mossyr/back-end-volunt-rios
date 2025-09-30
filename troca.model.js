const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trocaSchema = new Schema({
    // A escala original que está sendo oferecida
    turno: { 
        type: Schema.Types.ObjectId, 
        ref: 'Turno', // Nome do seu modelo de escala
        required: true 
    },
    // Quem está pedindo a troca
    solicitante: { 
        type: Schema.Types.ObjectId, 
        ref: 'Usuario', // Nome do seu modelo de usuário
        required: true 
    },
    // Para quem o pedido foi enviado
    destinatario: { 
        type: Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true 
    },
    // Status do pedido
    status: {
        type: String,
        enum: ['pendente', 'aceita', 'recusada', 'cancelada'],
        default: 'pendente'
    }
}, {
    timestamps: true
});

const Troca = mongoose.model('Troca', trocaSchema);

module.exports = Troca;