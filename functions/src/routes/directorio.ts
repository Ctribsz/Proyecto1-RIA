import type { NextFunction, Request, Response } from "express";

import { listDoctors } from "../services/medicos";
import {
  ValidationError,
  optionalQueryText,
  parsePositiveInteger,
  parseZone,
} from "../utils/validation";

export async function getDirectory(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = parsePositiveInteger(request.query.page, "page", 1, 100);
    const pageSize = parsePositiveInteger(
      request.query.pageSize,
      "pageSize",
      10,
      50,
    );
    const specialty = optionalQueryText(
      request.query.especialidad,
      "especialidad",
      80,
    );
    const zone =
      request.query.zona === undefined || request.query.zona === ""
        ? undefined
        : parseZone(request.query.zona);

    const result = await listDoctors({ page, pageSize, specialty, zone });

    response.json({
      datos: result.data,
      paginacion: {
        page,
        pageSize,
        hasNext: result.hasNext,
      },
      filtros: {
        especialidad: specialty ?? null,
        zona: zone ?? null,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      response.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
}
