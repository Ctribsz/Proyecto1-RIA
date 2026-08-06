import express from "express";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";

import { functionRegion } from "./config";
import { ipWhitelist } from "./middleware/ipWhitelist";

const helloApp = express();
helloApp.disable("x-powered-by");
helloApp.use(ipWhitelist);
helloApp.get("/", (_request, response) => {
  logger.info("La función holaMundo fue llamada.");
  response.send(
    `Hola Mundo desde Firebase Functions.\nFecha: ${new Date().toISOString()}`,
  );
});

export const holaMundo = onRequest(
  { region: functionRegion, invoker: "public" },
  helloApp,
);
