import { logger } from "firebase-functions";
import type { NextFunction, Request, RequestHandler, Response } from "express";

import { allowedIps } from "../config";

export function normalizeIp(ip: string): string {
  const trimmedIp = ip.trim();
  return trimmedIp.startsWith("::ffff:") ? trimmedIp.slice(7) : trimmedIp;
}

export function getTrustedClientIp(
  forwardedFor: string | string[] | undefined,
  fallbackIp: string,
): string {
  const forwardedIps = (Array.isArray(forwardedFor) ? forwardedFor : [forwardedFor])
    .flatMap((value) => value?.split(",") ?? [])
    .map(normalizeIp)
    .filter(Boolean);

  // Google agrega al final la IP del cliente y la del balanceador. Cualquier
  // valor anterior pudo ser proporcionado por el solicitante y no es confiable.
  if (forwardedIps.length >= 2) {
    return forwardedIps[forwardedIps.length - 2] ?? "";
  }

  return forwardedIps[0] ?? normalizeIp(fallbackIp);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers["x-forwarded-for"];

  return getTrustedClientIp(
    forwardedFor,
    request.socket.remoteAddress ?? request.ip ?? "",
  );
}

export function isIpAllowed(
  clientIp: string,
  configuredIps: string,
  isEmulator: boolean,
): boolean {
  const normalizedClientIp = normalizeIp(clientIp);
  if (
    isEmulator &&
    ["", "127.0.0.1", "::1"].includes(normalizedClientIp)
  ) {
    return true;
  }

  const whitelist = configuredIps
    .split(",")
    .map(normalizeIp)
    .filter(Boolean);

  return whitelist.includes(normalizedClientIp);
}

export function createIpWhitelist(
  getConfiguredIps: () => string = () => allowedIps.value(),
): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    const clientIp = getClientIp(request);
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

    if (!isIpAllowed(clientIp, getConfiguredIps(), isEmulator)) {
      logger.warn("Solicitud rechazada por IP whitelist", {
        clientIp,
        path: request.path,
      });
      response.status(403).json({ error: "IP no autorizada." });
      return;
    }

    next();
  };
}

export const ipWhitelist = createIpWhitelist();
