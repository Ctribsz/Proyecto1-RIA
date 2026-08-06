import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeForSearch,
  parsePositiveInteger,
  parseZone,
  requireText,
} from "./validation";

test("normaliza texto para filtros exactos", () => {
  assert.equal(normalizeForSearch("  CARDIOLOGÍA   Pediátrica "), "cardiologia pediatrica");
});

test("normaliza zonas válidas y rechaza valores fuera de rango", () => {
  assert.equal(parseZone("Zona 10"), "10");
  assert.equal(parseZone("zona 1"), "1");
  assert.throws(() => parseZone("26"), /entre 1 y 25/);
});

test("valida textos y enteros de paginación", () => {
  assert.equal(requireText("  Pediatría  ", "especialidad", 80), "Pediatría");
  assert.equal(parsePositiveInteger("50", "pageSize", 10, 50), 50);
  assert.throws(
    () => parsePositiveInteger("51", "pageSize", 10, 50),
    /no puede superar 50/,
  );
});
