function getConfiguredApiKeys() {
  const raw = process.env.API_KEYS || '';
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

// Mismo patron que anime1v-api-main: header X-API-Key contra una lista de
// keys validas en API_KEYS (separadas por coma). DISABLE_AUTH=true la salta
// por completo, util para desarrollo local.
function requireApiKey(req, res, next) {
  if (String(process.env.DISABLE_AUTH).toLowerCase() === 'true') {
    return next();
  }

  const apiKey = (req.header('x-api-key') || '').trim();
  if (!apiKey) {
    return res.status(401).json({ error: 'API Key requerida. Usa el header X-API-Key' });
  }

  const configuredKeys = getConfiguredApiKeys();
  if (configuredKeys.length > 0 && !configuredKeys.includes(apiKey)) {
    return res.status(401).json({ error: 'API Key invalida' });
  }

  next();
}

module.exports = { requireApiKey };
