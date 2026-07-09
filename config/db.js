// config/db.js
const mongoose = require('mongoose');
const dns = require('dns');

// Mismo workaround que anistream-backend: forzar DNS publicos porque el
// resolver del sistema en este entorno falla al resolver los registros SRV
// de MongoDB Atlas (querySrv ECONNREFUSED).
dns.setServers(['1.1.1.1', '8.8.8.8', '8.8.4.4']);

async function connectDB(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    family: 4,
    retryWrites: true,
    retryReads: true,
  });
}

module.exports = connectDB;
