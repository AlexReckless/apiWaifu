# Requisitos — apiWaifu (Backend de personajes para el gacha, reemplazo de Jikan)

## Sistema

- Node.js 18 LTS o superior (usa `fetch` nativo en `scripts/fetchImages.js`).
- Una base de datos **MongoDB** accesible (Atlas u otra instancia).

## Dependencias principales (`package.json`)

- `express`, `cors`, `dotenv`
- `mongoose` (ODM de MongoDB)

Dev: `nodemon`

## Variables de entorno (`.env`)

Ver `.env.example` para la plantilla completa.

| Variable | Para qué sirve |
|---|---|
| `MONGODB_URI` | Connection string completo de MongoDB |
| `PORT` | Puerto del servidor (default `3000` si no se define) |
| `API_KEYS` | Lista de API keys válidas separadas por coma, requeridas por el header `X-API-Key` en `/api/characters/*` |
| `DISABLE_AUTH` | Si es `true`, desactiva la validación de API key (solo para desarrollo local) |

## Instalación y ejecución

```bash
npm install
npm run dev     # con nodemon
# o
npm start
```

## Sembrar y completar imágenes

```bash
npm run seed          # borra la coleccion "characters" y carga seed/seedData.js
npm run fetch-images  # rellena imagenUrl con hotlinks a Wikipedia (no descarga archivos)
```

`fetch-images` hace una pausa de 300ms entre personajes para no saturar la API pública de Wikipedia, e imprime al final la lista de personajes para los que no encontró imagen (hay que completarlos a mano vía `PATCH`/edición directa en Mongo, o dejando `imagenUrl` vacío — el frontend ya maneja el caso de portada faltante).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Chequeo de salud |
| GET | `/api/characters/random?count=&tipo=` | N personajes aleatorios (máx 50) |
| GET | `/api/characters?tipo=&origen=&page=&limit=` | Listado paginado |
| GET | `/api/characters/:id` | Un personaje por ID |
| POST | `/api/characters` | Crea un personaje nuevo (usado por `OriginalCharacterScreen` para rarezas distintas de OR) |

Todos requieren el header `X-API-Key` salvo que `DISABLE_AUTH=true`.

## Notas de seguridad

- El `.env` real usa el mismo cluster/usuario de MongoDB Atlas que `anistream-backend` (base de datos separada, `apiWaifu`). Si en algún momento se rota la contraseña de ese usuario en Atlas, hay que actualizarla en los `.env` de los dos proyectos.
- La ruta `POST /api/characters` queda pública (con API key) — cualquiera con la key puede agregar personajes al catálogo compartido del gacha. No hay límite de tasa propio; si se despliega en Render, considerar agregar un rate limit si se vuelve un problema.
