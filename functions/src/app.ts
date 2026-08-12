import express from "express";
import { logger } from "firebase-functions";
import type { NextFunction, Request, Response } from "express";

import { bodyLimitMiddleware } from "./middleware/bodyLimit";
import { corsMiddleware } from "./middleware/cors";
import { ipWhitelist } from "./middleware/ipWhitelist";
import { getDirectory } from "./routes/directorio";
import { collectDoctors } from "./routes/recolectar";

export const app = express();

app.disable("x-powered-by");
app.use(ipWhitelist);
app.use(corsMiddleware);
app.use(bodyLimitMiddleware);

app.get(["/", "/hola"], (_request: Request, response: Response) => {
  response.json({
    mensaje: "Directorio de Médicos Especialistas",
    estado: "ok",
    fecha: new Date().toISOString(),
  });
});
app.post("/recolectar", collectDoctors);
app.get("/directorio", getDirectory);

app.use((_request: Request, response: Response) => {
  response.status(404).json({ error: "Ruta no encontrada." });
});

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    logger.error("Error no controlado en la API", error);
    response.status(500).json({ error: "Error interno del servidor." });
  },
);
