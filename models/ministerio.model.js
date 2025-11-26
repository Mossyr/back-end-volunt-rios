const mongoose = require('mongoose');
const { Schema } = mongoose;

const ministerioSchema = new Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  descricao: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const Ministerio = mongoose.model('Ministerio', ministerioSchema);

module.exports = Ministerio;