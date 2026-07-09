require('dotenv').config();
const express = require('express');
const cors = require('cors');

const characterRoutes = require('./routes/characters');
const connectDB = require('./config/db');

const app = express();
app.use(cors());
// Limite default de express.json() es 100kb, muy poco para una imagen en
// base64 (los personajes que no son OR guardan su imagen asi, sin depender
// de ningun enlace externo). 10mb da margen de sobra para una sola imagen.
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({
    mensaje: 'API Waifu funcionando. Reemplazo propio de Jikan.',
    endpoints: {
      random: '/api/characters/random?count=5&tipo=anime',
      listado: '/api/characters?tipo=videojuego&page=1&limit=20',
      porId: '/api/characters/:id',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.use('/api/characters', characterRoutes);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('ERROR: no se encontro MONGODB_URI en el archivo .env');
  process.exit(1);
}

connectDB(MONGO_URI)
  .then(() => {
    console.log('Conectado a MongoDB');
    app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err.message);
    process.exit(1);
  });
