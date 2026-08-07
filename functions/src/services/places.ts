import type { MedicoFirestore } from "../types/medico";
import { normalizeForSearch } from "../utils/validation";

const placesEndpoint = "https://places.googleapis.com/v1/places:searchText";
const placesFieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.nationalPhoneNumber",
  "places.websiteUri",
].join(",");

const socialHosts = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
];

interface GooglePlace {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  primaryType?: string;
  types?: string[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
}

const guatemalaCityBounds = {
  low: { latitude: 14.45, longitude: -90.7 },
  high: { latitude: 14.75, longitude: -90.35 },
};

interface TextSearchResponse {
  places?: GooglePlace[];
}

export class PlacesApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlacesApiError";
  }
}

export function sanitizeWebsite(website: string | undefined): string {
  if (!website) {
    return "";
  }

  try {
    const url = new URL(website);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const isSocialNetwork = socialHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );

    return ["http:", "https:"].includes(url.protocol) && !isSocialNetwork
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export async function searchPlaces(
  keyword: string,
  zone: string,
  specialty: string,
  apiKey: string,
): Promise<MedicoFirestore[]> {
  const textQuery = `${keyword} zona ${zone}, Ciudad de Guatemala, Guatemala`;
  const response = await fetch(placesEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": placesFieldMask,
    },
    body: JSON.stringify({
      textQuery,
      pageSize: 20,
      languageCode: "es",
      regionCode: "GT",
      locationRestriction: {
        rectangle: {
          low: guatemalaCityBounds.low,
          high: guatemalaCityBounds.high,
        },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new PlacesApiError(
      `Google Places respondió HTTP ${response.status}: ${details}`,
    );
  }

  const data = (await response.json()) as TextSearchResponse;
  const doctors = new Map<string, MedicoFirestore>();

  for (const place of data.places ?? []) {
    const placeId = place.id?.trim();
    const name = place.displayName?.text?.trim();
    const address = place.formattedAddress?.trim() ?? "";
    if (!placeId || !name) {
      continue;
    }

    doctors.set(placeId, {
      nombre: name,
      especialidad: specialty,
      direccion: address,
      telefono: place.nationalPhoneNumber?.trim() ?? "",
      sitio_web: sanitizeWebsite(place.websiteUri),
      zona: zone,
      place_id: placeId,
      keyword_usado: textQuery,
      tipo_principal_google: place.primaryType?.trim() ?? "",
      tipos_google: place.types ?? [],
      especialidad_busqueda: normalizeForSearch(specialty),
      nombre_busqueda: normalizeForSearch(name),
      zona_busqueda: zone,
    });
  }

  return [...doctors.values()].slice(0, 20);
}
