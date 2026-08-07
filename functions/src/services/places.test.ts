import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeWebsite, searchPlaces } from "./places";

test("descarta redes sociales y URLs no válidas", () => {
  assert.equal(sanitizeWebsite("https://www.facebook.com/clinica"), "");
  assert.equal(sanitizeWebsite("javascript:alert(1)"), "");
  assert.equal(
    sanitizeWebsite("https://clinica.example/consulta"),
    "https://clinica.example/consulta",
  );
});

test("mapea y limita una búsqueda a 20 lugares", async () => {
  const originalFetch = globalThis.fetch;
  let sentBody: Record<string, unknown> = {};

  globalThis.fetch = (async (_input, init) => {
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
  }) as typeof fetch;

  try {
    const doctors = await searchPlaces("cardiólogo", "10", "Cardiología", "test-key");

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
  } finally {
    globalThis.fetch = originalFetch;
  }
});
