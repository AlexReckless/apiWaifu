// Este script consulta la API publica de Wikipedia para encontrar la miniatura
// oficial de cada personaje, DESCARGA esos bytes del lado del servidor y los
// guarda en base64 en el campo "imagenUrl" (mismo formato que usan los
// personajes que suben los usuarios desde la app). No se hace hotlink en
// tiempo de ejecucion: Wikimedia devuelve 403 a las peticiones de imagen que
// hace React Native/Android desde el celular (su politica de User-Agent no
// se respeta de forma confiable en el prop "headers" de <Image> en Android),
// asi que la unica forma robusta es traer la imagen una sola vez aqui y
// guardarla ya lista para servir sin depender de Wikipedia en cada carga.
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

// Tope de seguridad: no vale la pena guardar miniaturas gigantes en Mongo.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB

// Encuentra la URL de la miniatura de la pagina y descarga los bytes,
// devolviendo un data URI base64 listo para guardar (o null si no se pudo).
async function obtenerImagenBase64(titulo) {
  const url = WIKI_SUMMARY + encodeURIComponent(titulo);
  const res = await fetchWiki(url);
  if (!res || !res.ok) return null;

  const data = await res.json();
  const imageUrl = data.thumbnail?.source || data.originalimage?.source || null;
  if (!imageUrl) return null;

  const imgRes = await fetchWiki(imageUrl);
  if (!imgRes || !imgRes.ok) return null;

  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;

  return `data:${contentType};base64,${buffer.toString('base64')}`;
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

      const imagenBase64 = await obtenerImagenBase64(titulo);
      if (imagenBase64) {
        p.imagenUrl = imagenBase64;
        await p.save();
        actualizados++;
        console.log(`OK  -> ${p.nombre}: imagen guardada (${(imagenBase64.length / 1024).toFixed(0)} KB base64)`);
      } else {
        sinImagen.push(p.nombre);
        console.log(`SIN IMAGEN -> ${p.nombre} (pagina "${titulo}" sin miniatura descargable)`);
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
