# API Waifu

API propia de personajes femeninos de anime, videojuegos y comics (clasificacion general),
pensada como reemplazo de Jikan para tu aplicacion gacha. Devuelve nombre, edad, signo,
fecha de nacimiento, origen, sinopsis y un valor de popularidad que puedes usar para
calcular la rareza de cada carta.

**Nota:** este catalogo NO incluye contenido +18 / hentai por diseño.

## ⚠️ Seguridad primero

Tu cadena de conexion de MongoDB fue compartida en texto plano en algun momento.
Antes de desplegar este proyecto:

1. Ve a MongoDB Atlas → Database Access → edita tu usuario `Recklesstream` → **cambia la contraseña**.
2. Nunca pegues la cadena completa (usuario+password) en chats, tickets o repos publicos.
3. Este proyecto NUNCA trae la contraseña dentro del codigo: se lee desde `.env`, que esta en `.gitignore`.

## Instalacion

```bash
npm install
cp .env.example .env
```

Edita `.env` y coloca tu cadena de conexion real (ya con la contraseña rotada):

```
MONGO_URI=mongodb+srv://usuario:NUEVA_PASSWORD@noloentenderias.uitwwng.mongodb.net/apiWaifu
PORT=3000
```

## Sembrar la base de datos

Esto borra la coleccion `characters` existente y carga el catalogo incluido (74 personajes):

```bash
npm run seed
```

## Levantar el servidor

```bash
npm start
```

o en modo desarrollo con recarga automatica:

```bash
npm run dev
```

## Endpoints

### `GET /api/characters/random?count=5&tipo=anime`
Endpoint principal para tu gacha. Devuelve N personajes aleatorios.
- `count` (opcional, default 5, maximo 50)
- `tipo` (opcional): `anime` | `videojuego` | `comic`

Ejemplo de respuesta:
```json
{
  "count": 5,
  "characters": [
    {
      "_id": "...",
      "nombre": "Nezuko Kamado",
      "edad": 14,
      "signo": "Aries",
      "fechaNacimiento": "28-12",
      "origen": "Demon Slayer",
      "tipo": "anime",
      "sinopsis": "...",
      "popularidad": 90,
      "imagenUrl": ""
    }
  ]
}
```

### `GET /api/characters?tipo=comic&page=1&limit=20`
Listado paginado ordenado por popularidad descendente.

### `GET /api/characters/:id`
Obtiene un personaje especifico por su ID de Mongo.

### `POST /api/characters`
Crea un nuevo personaje (para que sigas ampliando el catalogo con tus propios datos/imagenes).

## Imagenes de personajes

Tienes 3 opciones, de mas automatica a mas control manual:

### Opcion A (recomendada, automatica): Wikipedia
Despues de correr `npm run seed`, ejecuta:

```bash
npm run fetch-images
```

Esto recorre tu base de datos, busca cada personaje en Wikipedia y guarda el ENLACE
a su imagen oficial (miniatura) en el campo `imagenUrl`. No descarga ni redistribuye
el archivo: tu API solo apunta a la URL publica de Wikipedia, igual que hacen muchas
apps y bots. Requiere Node 18+ (usa `fetch` nativo) y conexion a internet.

Al final del proceso te imprime una lista de los personajes para los que NO encontro
imagen (paginas ambiguas, nombres poco comunes, etc.) para que los rellenes a mano.

### Opcion B: tus propias imagenes
Sube tus propias imagenes a un bucket (S3, Cloudinary, Firebase Storage) y llena
`imagenUrl` manualmente o via `POST /api/characters`.

### Opcion C: arte generado o con licencia libre
Usa arte generado por IA o bajo licencia libre para evitar cualquier duda de derechos.

**Nota:** la opcion A depende de que Wikipedia tenga pagina e imagen para cada personaje;
la cobertura suele ser buena para personajes populares (que es justo lo que necesitas
para tu sistema de rareza) pero no perfecta al 100%.

## Desplegar en Render

1. Sube este proyecto a un repo de GitHub (asegurate de que `.env` NO se suba).
2. En Render, crea un "Web Service" apuntando al repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. En "Environment", agrega la variable `MONGO_URI` con tu cadena real (con password rotada).
6. Corre `npm run seed` una vez (puedes hacerlo localmente apuntando al mismo cluster, o como
   un "Job" de Render) para poblar la base de datos.

## Ampliar el catalogo

Todos los personajes viven en `seed/seedData.js` como un arreglo plano de objetos JS.
Para agregar mas, simplemente añade nuevos objetos siguiendo el mismo schema y vuelve a
correr `npm run seed`, o usa el endpoint `POST /api/characters` directamente en produccion.
