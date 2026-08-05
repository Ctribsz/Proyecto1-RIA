import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";

import { functionRegion } from "./config";

export const holaMundo = onRequest(
  { region: functionRegion, invoker: "public" },
  (_request, response) => {
    logger.info("La función holaMundo fue llamada.");
    response.send(
      `Hola Mundo desde Firebase Functions.\nFecha: ${new Date().toISOString()}`,
    );
  },
);
