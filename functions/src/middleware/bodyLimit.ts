import type { NextFunction, Request, RequestHandler, Response } from "express";

const maximumBodyBytes = 16 * 1024;

type FirebaseRequest = Request & { rawBody?: Buffer };

export function bodyLimit(
  request: FirebaseRequest,
  response: Response,
  next: NextFunction,
): void {
  const contentLength = Number(request.headers["content-length"] ?? 0);
  const bodyBytes = request.rawBody?.byteLength ?? contentLength;

  if (Number.isFinite(bodyBytes) && bodyBytes > maximumBodyBytes) {
    response.status(413).json({ error: "El cuerpo de la solicitud es demasiado grande." });
    return;
  }

  next();
}

export const bodyLimitMiddleware: RequestHandler = bodyLimit;
