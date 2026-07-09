// Sube imagenes locales (puestas a mano por el dueño del proyecto) como base64
// para personajes que no tienen foto todavia. No descarga nada de internet.
//
// Uso:
//   1. Poné las imagenes en apiWaifu/local_images/, una por personaje.
//      El nombre del archivo puede ser parecido al nombre del personaje
//      (no hace falta que sea exacto): "Nico Robin.jpg", "chi-chi.png",
//      "spider_gwen.jpeg", etc. Extensiones soportadas: jpg, jpeg, png, webp.
//   2. node scripts/uploadLocalImages.js
//
// El script normaliza nombres (minusculas, sin espacios/guiones/parentesis)
// para emparejar el archivo con el personaje en la base de datos, y solo
// sube si encuentra una coincidencia razonablemente clara.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Character = require('../models/Character');
const connectDB = require('../config/db');

const MONGO_URI = process.env.MONGODB_URI;
const IMAGES_DIR = path.join(__dirname, '..', 'local_images');

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function normalizar(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/\([^)]*\)/g, '') // quita paréntesis y su contenido
    .replace(/[^a-z0-9]/g, ''); // deja solo letras/numeros
}

async function run() {
  if (!MONGO_URI) {
    console.error('ERROR: no se encontro MONGODB_URI en el archivo .env');
    process.exit(1);
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`No existe la carpeta ${IMAGES_DIR}. Creala y poné ahí las imágenes.`);
    process.exit(1);
  }

  const archivos = fs.readdirSync(IMAGES_DIR).filter((f) => EXT_TO_MIME[path.extname(f).toLowerCase()]);
  if (archivos.length === 0) {
    console.error('No hay imagenes (jpg/jpeg/png/webp) en local_images/.');
    process.exit(1);
  }

  await connectDB(MONGO_URI);
  console.log('Conectado a MongoDB.');

  const personajes = await Character.find({});
  console.log(`${archivos.length} archivos encontrados, ${personajes.length} personajes en la base.`);

  let subidos = 0;
  const sinMatch = [];

  for (const archivo of archivos) {
    const base = path.basename(archivo, path.extname(archivo));
    const normArchivo = normalizar(base);

    const match = personajes.find((p) => normalizar(p.nombre) === normArchivo)
      || personajes.find((p) => normalizar(p.nombre).includes(normArchivo) || normArchivo.includes(normalizar(p.nombre)));

    if (!match) {
      sinMatch.push(archivo);
      console.log(`SIN MATCH -> ${archivo} (no encontré un personaje parecido a "${base}")`);
      continue;
    }

    const ext = path.extname(archivo).toLowerCase();
    const mime = EXT_TO_MIME[ext];
    const buffer = fs.readFileSync(path.join(IMAGES_DIR, archivo));
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;

    match.imagenUrl = dataUri;
    await match.save();
    subidos++;
    console.log(`OK -> ${archivo} -> ${match.nombre} (${(buffer.length / 1024).toFixed(0)} KB)`);
  }

  console.log(`\nListo. ${subidos} imagenes subidas.`);
  if (sinMatch.length) {
    console.log(`\nSin match (${sinMatch.length}), revisá el nombre del archivo:`);
    console.log(sinMatch.join(', '));
  }

  process.exit(0);
}

run();
