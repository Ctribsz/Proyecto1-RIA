export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-GT")
    .replace(/\s+/g, " ");
}

export function requireText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`El campo ${field} es obligatorio.`);
  }

  const cleanValue = value.trim().replace(/\s+/g, " ");
  if (cleanValue.length < 2 || cleanValue.length > maxLength) {
    throw new ValidationError(
      `El campo ${field} debe tener entre 2 y ${maxLength} caracteres.`,
    );
  }

  return cleanValue;
}

export function parseZone(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new ValidationError("El campo zona es obligatorio.");
  }

  const zone = String(value).trim().replace(/^zona\s+/i, "");
  if (!/^(?:[1-9]|1\d|2[0-5])$/.test(zone)) {
    throw new ValidationError("La zona debe ser un número entre 1 y 25.");
  }

  return String(Number(zone));
}

export function optionalQueryText(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (Array.isArray(value)) {
    throw new ValidationError(`El parámetro ${field} solo puede aparecer una vez.`);
  }

  return requireText(value, field, maxLength);
}

export function parsePositiveInteger(
  value: unknown,
  field: string,
  defaultValue: number,
  maximum?: number,
): number {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  if (Array.isArray(value) || typeof value === "object") {
    throw new ValidationError(`El parámetro ${field} no es válido.`);
  }

  const text = String(value);
  if (!/^\d+$/.test(text)) {
    throw new ValidationError(`El parámetro ${field} debe ser un entero positivo.`);
  }

  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new ValidationError(`El parámetro ${field} debe ser un entero positivo.`);
  }
  if (maximum !== undefined && number > maximum) {
    throw new ValidationError(`El parámetro ${field} no puede superar ${maximum}.`);
  }

  return number;
}
