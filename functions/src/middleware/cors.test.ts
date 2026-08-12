import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import { corsMiddleware } from "./cors";

test("CORS autoriza Hosting y rechaza preflight de otros orígenes", async () => {
  const corsApp = express();
  corsApp.use(corsMiddleware);
  corsApp.get("/", (_request, response) => response.json({ ok: true }));
  const server = corsApp.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));

  try {
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/`;
    const allowed = await fetch(url, {
      method: "OPTIONS",
      headers: { Origin: "https://ria-proyecto1.web.app" },
    });
    assert.equal(allowed.status, 204);
    assert.equal(
      allowed.headers.get("access-control-allow-origin"),
      "https://ria-proyecto1.web.app",
    );

    const denied = await fetch(url, {
      method: "OPTIONS",
      headers: { Origin: "https://example.com" },
    });
    assert.equal(denied.status, 403);

    const local = await fetch(url, {
      method: "OPTIONS",
      headers: { Origin: "http://127.0.0.1:5002" },
    });
    assert.equal(local.status, 204);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
