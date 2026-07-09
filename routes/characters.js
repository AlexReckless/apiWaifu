const express = require('express');
const router = express.Router();
const Character = require('../models/Character');
const { requireApiKey } = require('../middlewares/auth');

router.use(requireApiKey);

// GET /api/characters/random?count=5&tipo=anime
// Endpoint principal para tu gacha: devuelve N personajes aleatorios
router.get('/random', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 5, 50); // tope de seguridad
    const match = {};
    if (req.query.tipo) match.tipo = req.query.tipo;

    const characters = await Character.aggregate([
      { $match: match },
      { $sample: { size: count } },
    ]);

    res.json({ count: characters.length, characters });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener personajes aleatorios', detail: err.message });
  }
});

// GET /api/characters?tipo=anime&page=1&limit=20
// Listado paginado, util para explorar el catalogo completo
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const filter = {};
    if (req.query.tipo) filter.tipo = req.query.tipo;
    if (req.query.origen) filter.origen = new RegExp(req.query.origen, 'i');
    if (req.query.nombre) filter.nombre = new RegExp(req.query.nombre, 'i');

    const total = await Character.countDocuments(filter);
    const characters = await Character.find(filter)
      .sort({ popularidad: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ total, page, limit, characters });
  } catch (err) {
    res.status(500).json({ error: 'Error al listar personajes', detail: err.message });
  }
});

// GET /api/characters/:id
router.get('/:id', async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    if (!character) return res.status(404).json({ error: 'Personaje no encontrado' });
    res.json(character);
  } catch (err) {
    res.status(400).json({ error: 'ID invalido', detail: err.message });
  }
});

// POST /api/characters  (para agregar tus propios personajes despues)
router.post('/', async (req, res) => {
  try {
    const nuevo = await Character.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: 'Error al crear personaje', detail: err.message });
  }
});

module.exports = router;
