/**
 * Cloud Functions para Firebase — Proyecto ResponsableAI
 *
 * Esta es una función HTTP sencilla: se ejecuta en Google Cloud (GCP)
 * y responde cada vez que alguien "la llama" abriendo su URL.
 *
 * Docs: https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Función HTTP llamada "holaMundo".
// Cuando la despliegas, Firebase la crea dentro de tu proyecto de GCP.
exports.holaMundo = onRequest((request, response) => {
  // Este log aparecerá en los registros de GCP (prueba de que se ejecutó).
  logger.info("¡La función holaMundo fue llamada!", { structuredData: true });

  response.send(
    "¡Hola Mundo! 🎉 Firebase está ejecutando esta función en GCP.\n" +
      "Proyecto: responsableai-92261\n" +
      "Fecha de la llamada: " + new Date().toISOString()
  );
});
