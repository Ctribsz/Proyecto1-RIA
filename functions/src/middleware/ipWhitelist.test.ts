import assert from "node:assert/strict";
import test from "node:test";

import { getTrustedClientIp, isIpAllowed, normalizeIp } from "./ipWhitelist";

test("normaliza direcciones IPv4 representadas como IPv6", () => {
  assert.equal(normalizeIp("::ffff:192.0.2.10"), "192.0.2.10");
});

test("autoriza solamente direcciones configuradas", () => {
  assert.equal(isIpAllowed("192.0.2.10", "192.0.2.10, 198.51.100.2", false), true);
  assert.equal(isIpAllowed("192.0.2.11", "192.0.2.10, 198.51.100.2", false), false);
});

test("usa la IP agregada por Google e ignora valores falsificados", () => {
  assert.equal(
    getTrustedClientIp(
      "192.0.2.10, 203.0.113.50, 35.191.0.1",
      "10.0.0.1",
    ),
    "203.0.113.50",
  );
  assert.equal(getTrustedClientIp("192.0.2.10", "10.0.0.1"), "192.0.2.10");
  assert.equal(getTrustedClientIp(undefined, "10.0.0.1"), "10.0.0.1");
});

test("el emulador autoriza loopback sin abrir otras direcciones", () => {
  assert.equal(isIpAllowed("", "", true), true);
  assert.equal(isIpAllowed("127.0.0.1", "", true), true);
  assert.equal(isIpAllowed("::1", "", true), true);
  assert.equal(isIpAllowed("192.0.2.10", "", true), false);
});
