import type { NextFunction, Request, RequestHandler, Response } from "express";

const allowedOrigins = new Set([
  "https://ria-proyecto1.web.app",
  "https://ria-proyecto1.firebaseapp.com",
  "http://127.0.0.1:5000",
  "http://localhost:5000",
]);

export function cors(request: Request, response: Response, next: NextFunction): void {
  const origin = request.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Vary", "Origin");
  }

  if (request.method === "OPTIONS") {
    if (!origin || !allowedOrigins.has(origin)) {
      response.status(403).json({ error: "Origen no autorizado." });
      return;
    }

    response.status(204).end();
    return;
  }

  next();
}

export const corsMiddleware: RequestHandler = cors;
