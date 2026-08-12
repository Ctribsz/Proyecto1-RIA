import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "./app";

test("rechaza una IP falsificada antes del límite de cuerpo", async () => {
  const previousAllowedIps = process.env.ALLOWED_IPS;
  const previousEmulator = process.env.FUNCTIONS_EMULATOR;
  process.env.ALLOWED_IPS = "192.0.2.10";
  process.env.FUNCTIONS_EMULATOR = "false";

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));

  try {
    const address = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/recolectar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // El primer valor está permitido, pero fue proporcionado por el atacante.
        "X-Forwarded-For": "192.0.2.10, 203.0.113.20, 35.191.0.1",
      },
      body: JSON.stringify({ contenido: "x".repeat(20_000) }),
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "IP no autorizada." });

    const authorizedResponse = await fetch(
      `http://127.0.0.1:${address.port}/recolectar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": "192.0.2.10, 35.191.0.1",
        },
        body: JSON.stringify({ contenido: "x".repeat(20_000) }),
      },
    );
    assert.equal(authorizedResponse.status, 413);
    assert.deepEqual(await authorizedResponse.json(), {
      error: "El cuerpo de la solicitud es demasiado grande.",
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    if (previousAllowedIps === undefined) delete process.env.ALLOWED_IPS;
    else process.env.ALLOWED_IPS = previousAllowedIps;
    if (previousEmulator === undefined) delete process.env.FUNCTIONS_EMULATOR;
    else process.env.FUNCTIONS_EMULATOR = previousEmulator;
  }
});
