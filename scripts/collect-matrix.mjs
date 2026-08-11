import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const endpoint =
  process.env.DIRECTORY_API_URL ??
  "https://us-central1-ria-proyecto1.cloudfunctions.net/api";
const intervalMs = Number(process.env.COLLECTION_INTERVAL_MS ?? 7_000);
const matrixPath = fileURLToPath(new URL("./search-matrix.json", import.meta.url));
const outputUrl = new URL("../docs/datos/recoleccion.json", import.meta.url);
const matrix = JSON.parse(await readFile(matrixPath, "utf8"));

if (!Number.isFinite(intervalMs) || intervalMs < 6_000) {
  throw new Error(
    "COLLECTION_INTERVAL_MS debe ser al menos 6000 para respetar 10 solicitudes por minuto.",
  );
}

await mkdir(fileURLToPath(new URL("../docs/datos/", import.meta.url)), {
  recursive: true,
});

const run = {
  inicio: new Date().toISOString(),
  api: endpoint,
  intervalo_ms: intervalMs,
  total_planificadas: matrix.length,
  resultados: [],
};

function saveProgress() {
  return writeFile(outputUrl, `${JSON.stringify(run, null, 2)}\n`);
}

for (const [index, search] of matrix.entries()) {
  const label = `${search.especialidad}, zona ${search.zona}`;
  process.stdout.write(`[${index + 1}/${matrix.length}] ${label}: `);

  try {
    const response = await fetch(`${endpoint}/recolectar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(search),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await response.json().catch(() => ({}));
    const result = {
      ...search,
      fecha: new Date().toISOString(),
      http: response.status,
      guardados: body.guardados ?? 0,
      eliminados_obsoletos: body.eliminados_obsoletos ?? 0,
      error: response.ok ? null : body.error ?? "Respuesta no válida",
    };
    run.resultados.push(result);
    process.stdout.write(
      response.ok
        ? `${result.guardados} guardados, ${result.eliminados_obsoletos} obsoletos eliminados\n`
        : `HTTP ${response.status}: ${result.error}\n`,
    );
  } catch (error) {
    run.resultados.push({
      ...search,
      fecha: new Date().toISOString(),
      http: null,
      guardados: 0,
      eliminados_obsoletos: 0,
      error: error instanceof Error ? error.message : String(error),
    });
    process.stdout.write(`ERROR: ${run.resultados.at(-1).error}\n`);
  }

  await saveProgress();
  if (index < matrix.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

run.fin = new Date().toISOString();
run.exitosas = run.resultados.filter((result) => result.http === 201).length;
run.fallidas = run.total_planificadas - run.exitosas;
await saveProgress();

console.log(`Finalizado: ${run.exitosas} exitosas, ${run.fallidas} fallidas.`);
if (run.fallidas > 0) process.exitCode = 1;
