import assert from "node:assert/strict";
import test from "node:test";

type Fetch = typeof fetch;

import {
  extractAddressZone,
  hasMedicalPlaceType,
  isInsideGuatemalaCity,
  sanitizeWebsite,
  searchPlaces,
} from "./places";

test("descarta redes sociales y URLs no válidas", () => {
  assert.equal(sanitizeWebsite("https://www.facebook.com/clinica"), "");
  assert.equal(sanitizeWebsite("https://wa.me/50238013259"), "");
  assert.equal(sanitizeWebsite("https://api.whatsapp.com/send?phone=50238013259"), "");
  assert.equal(sanitizeWebsite("javascript:alert(1)"), "");
  assert.equal(
    sanitizeWebsite("https://clinica.example/consulta"),
    "https://clinica.example/consulta",
  );
});

test("extrae una zona explícita de la dirección", () => {
  assert.equal(extractAddressZone("6 avenida 9-18 zona 10, Guatemala"), "10");
  assert.equal(extractAddressZone("Cdad. de Guatemala 01009"), "9");
  assert.equal(extractAddressZone("Ciudad de Guatemala"), undefined);
});

test("valida coordenadas dentro de Ciudad de Guatemala", () => {
  assert.equal(
    isInsideGuatemalaCity({ latitude: 14.60, longitude: -90.51 }),
    true,
  );
  assert.equal(
    isInsideGuatemalaCity({ latitude: 14.97, longitude: -89.53 }),
    false,
  );
  assert.equal(isInsideGuatemalaCity(undefined), false);
});

test("acepta únicamente categorías médicas devueltas por Google", () => {
  assert.equal(hasMedicalPlaceType(["doctor", "health"]), true);
  assert.equal(hasMedicalPlaceType(["foot_care", "establishment"]), false);
  assert.equal(hasMedicalPlaceType(undefined), false);
});

test("mapea y limita una búsqueda a 20 lugares", async () => {
  let sentBody: Record<string, unknown> = {};

  const fetchMock = (async (
    _input: unknown,
    init?: { body?: unknown },
  ) => {
    sentBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const places = Array.from({ length: 21 }, (_, index) => ({
      id: `place-${index}`,
      displayName: { text: `Clínica ${index}` },
      formattedAddress: `Dirección ${index}, zona 10`,
      location: { latitude: 14.60, longitude: -90.51 },
      primaryType: "doctor",
      types: ["doctor", "health"],
      nationalPhoneNumber: "2222-2222",
      websiteUri: "https://clinica.example",
    }));
    return new Response(JSON.stringify({ places }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as Fetch;

  const doctors = await searchPlaces(
    "cardiólogo",
    "10",
    "Cardiología",
    "test-key",
    fetchMock,
  );

  assert.equal(doctors.length, 20);
  assert.equal(doctors[0]?.place_id, "place-0");
  assert.equal(doctors[0]?.especialidad_busqueda, "cardiologia");
  assert.equal(sentBody.pageSize, 20);
  assert.deepEqual(sentBody.locationRestriction, {
    rectangle: {
      low: { latitude: 14.45, longitude: -90.7 },
      high: { latitude: 14.75, longitude: -90.35 },
    },
  });
  assert.equal(
    sentBody.textQuery,
    "cardiólogo zona 10, Ciudad de Guatemala, Guatemala",
  );
});

test("descarta resultados con una zona explícita diferente", async () => {
  const fetchMock = (async () =>
    new Response(
      JSON.stringify({
        places: [
          {
            id: "zona-correcta",
            displayName: { text: "Clínica Zona 10" },
            formattedAddress: "6 avenida 4-01 zona 10, Guatemala",
            location: { latitude: 14.60, longitude: -90.51 },
            types: ["doctor", "health"],
          },
          {
            id: "zona-incorrecta",
            displayName: { text: "Clínica Zona 9" },
            formattedAddress: "7 avenida 9-74 zona 9, Guatemala",
            location: { latitude: 14.60, longitude: -90.51 },
            types: ["doctor", "health"],
          },
        ],
      }),
      { status: 200 },
    )) as unknown as Fetch;

  const doctors = await searchPlaces(
    "cardiólogo",
    "10",
    "Cardiología",
    "key",
    fetchMock,
  );
  assert.deepEqual(doctors.map((doctor) => doctor.place_id), ["zona-correcta"]);
});
