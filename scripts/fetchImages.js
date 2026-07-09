// Este script NO descarga ni almacena imagenes.
// Solo consulta la API publica de Wikipedia para obtener la URL de la miniatura oficial
// de cada personaje y guarda ese ENLACE en el campo "imagenUrl" de tu base de datos.
// Es el mismo mecanismo de "hotlink" que usan muchas apps (apuntar a la imagen, no copiarla).
//
// Requiere Node 18+ (usa fetch nativo). Ejecutar DESPUES de "npm run seed".
//
// Uso:
//   node scripts/fetchImages.js

require('dotenv').config();
const Character = require('../models/Character');
const connectDB = require('../config/db');

const MONGO_URI = process.env.MONGODB_URI;
const WIKI_SEARCH = 'https://en.wikipedia.org/w/api.php';
const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const USER_AGENT = 'apiWaifu-image-fetcher/1.0 (proyecto personal, uso no comercial)';

// Pausa entre CADA peticion HTTP a Wikipedia (no solo entre personajes), para
// no pegarle al rate limit (429 "You are making too many requests to the API").
const REQUEST_DELAY_MS = 600;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// fetch con reintento y backoff exponencial cuando Wikipedia responde 429
async function fetchWiki(url, intentos = 4) {
  for (let intento = 1; intento <= intentos; intento++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

    if (res.status === 429) {
      const espera = 2000 * intento;
      await sleep(espera);
      continue;
    }

    await sleep(REQUEST_DELAY_MS);
    return res;
  }

  return null; // agoto reintentos, seguimos con el siguiente personaje
}

// Busqueda de texto completo (mucho mas tolerante que opensearch, que es por prefijo exacto)
async function buscarTextoCompleto(query) {
  const url = `${WIKI_SEARCH}?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&srlimit=1&format=json`;

  const res = await fetchWiki(url);
  if (!res || !res.ok) return null;

  const data = await res.json();
  const resultados = data?.query?.search;
  return resultados && resultados.length > 0 ? resultados[0].title : null;
}

// Busca el titulo de pagina de Wikipedia mas parecido al nombre del personaje.
// Primero intenta con nombre+origen (para desambiguar personajes con nombres comunes),
// y si no hay resultado cae a buscar solo por nombre.
async function buscarTitulo(nombre, origen) {
  const conOrigen = await buscarTextoCompleto(`${nombre} ${origen}`);
  if (conOrigen) return conOrigen;

  return buscarTextoCompleto(nombre);
}

// Obtiene la miniatura (thumbnail) de la pagina encontrada
async function obtenerImagen(titulo) {
  const url = WIKI_SUMMARY + encodeURIComponent(titulo);
  const res = await fetchWiki(url);
  if (!res || !res.ok) return null;

  const data = await res.json();
  return data.thumbnail?.source || data.originalimage?.source || null;
}

async function run() {
  if (!MONGO_URI) {
    console.error('ERROR: no se encontro MONGO_URI en el archivo .env');
    process.exit(1);
  }

  await connectDB(MONGO_URI);
  console.log('Conectado a MongoDB.');

  // Solo se procesan personajes que todavia no tienen imagen en base64.
  // Los personajes subidos por usuarios desde la app guardan su imagen como
  // "data:image/...;base64,..." directamente en Mongo (nunca dependen de un
  // enlace externo) y este script NUNCA debe pisar esa imagen.
  const todos = await Character.find({});
  const personajes = todos.filter((p) => !p.imagenUrl || !p.imagenUrl.startsWith('data:'));
  const omitidos = todos.length - personajes.length;
  console.log(`Se encontraron ${todos.length} personajes en la base de datos.`);
  if (omitidos > 0) {
    console.log(`Se omiten ${omitidos} personajes con imagen base64 (subidos por usuarios, nunca se tocan).`);
  }

  let actualizados = 0;
  let sinImagen = [];

  for (const p of personajes) {
    try {
      const titulo = await buscarTitulo(p.nombre, p.origen);
      if (!titulo) {
        sinImagen.push(p.nombre);
        continue;
      }

      const imagenUrl = await obtenerImagen(titulo);
      if (imagenUrl) {
        p.imagenUrl = imagenUrl;
        await p.save();
        actualizados++;
        console.log(`OK  -> ${p.nombre}: ${imagenUrl}`);
      } else {
        sinImagen.push(p.nombre);
        console.log(`SIN IMAGEN -> ${p.nombre} (pagina "${titulo}" sin miniatura)`);
      }
    } catch (err) {
      console.log(`ERROR -> ${p.nombre}: ${err.message}`);
      sinImagen.push(p.nombre);
    }
  }

  console.log(`\nListo. ${actualizados} personajes actualizados con imagen.`);
  if (sinImagen.length) {
    console.log(`\nSin imagen encontrada (${sinImagen.length}), rellena estos manualmente:`);
    console.log(sinImagen.join(', '));
  }

  process.exit(0);
}

run();
