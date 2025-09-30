const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    // Para quem é a notificação
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', // Referência ao seu modelo de Usuário
        required: true 
    },
    // Tipo da notificação, para o front-end saber como exibi-la
    type: {
        type: String,
        enum: ['SWAP_REQUEST', 'SWAP_INFO', 'GENERAL'], // Pedido de troca, Informativo de troca, etc.
        required: true
    },
    // A mensagem que será exibida
    message: { 
        type: String, 
        required: true 
    },
    // Flag para saber se o usuário já leu
    read: { 
        type: Boolean, 
        default: false 
    },
    // De quem veio a notificação (opcional, mas útil)
    fromUser: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    },
    // ID relacionado à notificação (ex: o ID da solicitação de troca)
    relatedId: {
        type: Schema.Types.ObjectId
    }
}, {
    timestamps: true // Cria os campos createdAt e updatedAt automaticamente
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;