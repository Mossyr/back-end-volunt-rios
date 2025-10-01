// Importa as bibliotecas necessárias
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Ministerio = require('./models/ministerio.model');

// Inicializa o aplicativo Express
const app = express();

// Configura os middlewares
app.use(cors());
app.use(express.json());

// --- FUNÇÃO PARA CRIAR MINISTÉRIOS INICIAIS (SEED) ---
async function seedInitialMinisterios() {
  try {
    const ministeriosIniciais = [
      { nome: 'Interna', descricao: 'Responsável pela organização e suporte interno dos cultos.' },
      { nome: 'Iluminação', descricao: 'Operação da mesa de iluminação durante os eventos.' },
      { nome: 'Som', descricao: 'Operação da mesa de som e equipamentos de áudio.' }
    ];
    for (const min of ministeriosIniciais) {
      const ministerioExistente = await Ministerio.findOne({ nome: min.nome });
      if (!ministerioExistente) {
        await Ministerio.create(min);
        console.log(`Ministério "${min.nome}" criado com sucesso.`);
      }
    }
  } catch (error) {
    console.error('Erro ao criar ministérios iniciais:', error);
  }
}

// Conexão com o Banco de Dados MongoDB
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB conectado com sucesso.');
    seedInitialMinisterios();
  })
  .catch(err => console.error('Erro ao conectar com o MongoDB:', err));

// Rotas da API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/ministerios', require('./routes/ministerio.routes'));
app.use('/api/lider', require('./routes/lider.routes'));
app.use('/api/chatbot', require('./routes/chatbot.routes'));

// ==========================================================
// LOG DE DIAGNÓSTICO ADICIONADO AQUI
console.log(`[DIAGNÓSTICO ${new Date().toLocaleTimeString()}] Montando as rotas de /api/escalas...`);
// ==========================================================
app.use('/api/escalas', require('./routes/escala.routes'));

app.use('/api/disponibilidade', require('./routes/disponibilidade.routes'));
app.use('/api/notificacoes', require('./routes/notification.routes'));

// Rota de teste inicial
app.get('/', (req, res) => {
  res.send('API do App de Escalas está no ar!');
});

// Define a porta a partir do arquivo .env ou usa 5000 como padrão
const PORT = process.env.PORT || 5000;

// --- INÍCIO DO CÓDIGO DE AUTO-PING ---

// URL da sua aplicação que será "pingada"
const PING_URL = "https://back-end-volunt-rios.onrender.com";
// Intervalo em minutos. 14 minutos é um valor seguro para evitar o "sleep"
const PING_INTERVAL_MINUTES = 10;

const selfPing = () => {
  fetch(PING_URL)
    .then(res => {
      // É importante consumir a resposta para fechar a conexão
      res.text().then(body => {
        console.log(`[Auto-Ping] Ping bem-sucedido em ${new Date().toLocaleString('pt-BR')}. Status: ${res.status}.`);
      });
    })
    .catch(err => {
      console.error(`[Auto-Ping] Erro: ${err.message} em ${new Date().toLocaleString('pt-BR')}`);
    });
};

// --- FIM DO CÓDIGO DE AUTO-PING ---

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  
  // Inicia o intervalo de pings DEPOIS que o servidor já está no ar
  setInterval(selfPing, PING_INTERVAL_MINUTES * 60 * 1000); // Converte minutos para milissegundos
});