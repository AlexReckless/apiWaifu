require('dotenv').config();
const Character = require('../models/Character');
const characters = require('./seedData');
const connectDB = require('../config/db');

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('ERROR: no se encontro MONGODB_URI en el archivo .env');
  process.exit(1);
}

async function seed() {
  try {
    await connectDB(MONGO_URI);
    console.log('Conectado a MongoDB, sembrando datos...');

    await Character.deleteMany({}); // limpia la coleccion antes de sembrar
    const inserted = await Character.insertMany(characters);

    console.log(`Se insertaron ${inserted.length} personajes correctamente.`);
    process.exit(0);
  } catch (err) {
    console.error('Error al sembrar datos:', err.message);
    process.exit(1);
  }
}

seed();
