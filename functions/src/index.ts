import express from "express";
import { initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";

import { app } from "./app";
import { functionRegion, googlePlacesApiKey } from "./config";
import { ipWhitelist } from "./middleware/ipWhitelist";

initializeApp();

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

export const api = onRequest(
  {
    region: functionRegion,
    networkInterface: {
      network: "ria-egress",
      subnetwork: "ria-egress-us-central1",
    },
    vpcEgress: "ALL_TRAFFIC",
    secrets: [googlePlacesApiKey],
    timeoutSeconds: 60,
    maxInstances: 3,
    invoker: "public",
  },
  app,
);
