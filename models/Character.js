const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    edad: { type: Number, default: null }, // null si es desconocida/ambigua en el canon
    signo: { type: String, default: null },
    fechaNacimiento: { type: String, default: null }, // formato "DD-MM" o "Desconocida"
    origen: { type: String, required: true }, // serie / videojuego / comic
    tipo: {
      type: String,
      enum: ['anime', 'videojuego', 'comic'],
      required: true,
    },
    sinopsis: { type: String, required: true },
    popularidad: { type: Number, required: true, min: 0, max: 100 }, // metadato informativo, ya no calcula la rareza
    imagenUrl: { type: String, default: '' }, // rellena con tus propias imágenes/licencias
    // OR (Original) queda afuera a propósito: esas siguen siendo cartas
    // privadas del usuario en anistream-backend, nunca personajes de este
    // catálogo compartido.
    rarity: {
      type: String,
      enum: ['R', 'SR', 'CR', 'SSR', 'SSR_SECRET', 'UR'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Character', CharacterSchema);
