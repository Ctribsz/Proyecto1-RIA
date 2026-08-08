import type { NextFunction, Request, Response } from "express";

import { googlePlacesApiKey } from "../config";
import { reconcileSearchResults } from "../services/medicos";
import { PlacesApiError, searchPlaces } from "../services/places";
import { ValidationError, parseZone, requireText } from "../utils/validation";

export async function collectDoctors(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const keyword = requireText(request.body?.keyword, "keyword", 80);
    const zone = parseZone(request.body?.zona);
    const specialty =
      request.body?.especialidad === undefined ||
      request.body?.especialidad === ""
        ? keyword
        : requireText(request.body.especialidad, "especialidad", 80);
    const apiKey = googlePlacesApiKey.value();

    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY no está configurada.");
    }

    const doctors = await searchPlaces(keyword, zone, specialty, apiKey);
    const keywordUsed =
      doctors[0]?.keyword_usado ??
      `${keyword} zona ${zone}, Ciudad de Guatemala, Guatemala`;
    const removed = await reconcileSearchResults(keywordUsed, doctors);

    response.status(201).json({
      guardados: doctors.length,
      eliminados_obsoletos: removed,
      limite_por_invocacion: 20,
      keyword_usado: keywordUsed,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof PlacesApiError) {
      response.status(502).json({
        error: "No fue posible consultar Google Places.",
        detalle: error.message,
      });
      return;
    }
    next(error);
  }
}
