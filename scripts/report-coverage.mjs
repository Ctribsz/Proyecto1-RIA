import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const endpoint =
  process.env.DIRECTORY_API_URL ??
  "https://us-central1-ria-proyecto1.cloudfunctions.net/api";
const outputDirectory = new URL("../docs/datos/", import.meta.url);
const reviewTokens = {
  "Cardiología": ["cardi", "corazon"],
  "Pediatría": ["pedi", "infantil", "nino", "kid", "neonat"],
  "Dermatología": ["derm", "piel", "skin"],
  "Ginecología": ["gine", "gyne", "obst", "mujer", "women", "fetal", "embarazo"],
  "Neurología": ["neuro", "cerebr", "epilep"],
};

function normalized(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function fetchAllDoctors() {
  const doctors = [];
  for (let page = 1; page <= 100; page += 1) {
    const url = new URL(`${endpoint}/directorio`);
    url.search = new URLSearchParams({
      page: String(page),
      pageSize: "50",
    }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`GET /directorio respondió HTTP ${response.status}: ${body.error}`);
    }
    doctors.push(...body.datos);
    if (!body.paginacion.hasNext) return doctors;
  }
  throw new Error("El directorio superó el límite documentado de 100 páginas.");
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

const doctors = await fetchAllDoctors();
const bySpecialty = new Map();
const byZone = new Map();
const byCombination = new Map();

for (const doctor of doctors) {
  increment(bySpecialty, doctor.especialidad);
  increment(byZone, doctor.zona);
  increment(byCombination, `${doctor.especialidad}|${doctor.zona}`);
}

const missingPhone = doctors.filter((doctor) => !doctor.telefono);
const missingWebsite = doctors.filter((doctor) => !doctor.sitio_web);
const reviewCandidates = doctors.filter((doctor) => {
  const tokens = reviewTokens[doctor.especialidad] ?? [];
  const searchableText = normalized(`${doctor.nombre} ${doctor.sitio_web}`);
  return tokens.length > 0 && !tokens.some((token) => searchableText.includes(token));
});
const generatedAt = new Date().toISOString();

const specialties = [...bySpecialty.keys()].sort((a, b) => a.localeCompare(b, "es"));
const zones = [...byZone.keys()].sort((a, b) => Number(a) - Number(b));
const lines = [
  "# Reporte de cobertura",
  "",
  `Generado: ${generatedAt}`,
  "",
  `Documentos únicos por \`place_id\`: **${doctors.length}**.`,
  `Sin teléfono: **${missingPhone.length}**. Sin sitio web: **${missingWebsite.length}**.`,
  "",
  "La última matriz ejecutó 20 búsquedas con una pausa de siete segundos y no",
  "superó 10 solicitudes por minuto. No se ejecutaron variantes adicionales.",
  "",
  "## Por especialidad",
  "",
  "| Especialidad | Registros |",
  "|---|---:|",
  ...specialties.map((specialty) => `| ${specialty} | ${bySpecialty.get(specialty)} |`),
  "",
  "## Por zona",
  "",
  "| Zona | Registros |",
  "|---:|---:|",
  ...zones.map((zone) => `| ${zone} | ${byZone.get(zone)} |`),
  "",
  "## Cobertura cruzada",
  "",
  "| Especialidad | Zona | Registros |",
  "|---|---:|---:|",
  ...specialties.flatMap((specialty) =>
    zones
      .filter((zone) => byCombination.has(`${specialty}|${zone}`))
      .map(
        (zone) =>
          `| ${specialty} | ${zone} | ${byCombination.get(`${specialty}|${zone}`)} |`,
      ),
  ),
  "",
  "## Revisión humana sugerida",
  "",
  "Los siguientes registros no contienen una palabra asociada a la especialidad",
  "en su nombre o URL. No son errores confirmados y no se eliminan automáticamente.",
  "La lista es deliberadamente amplia: un médico puede estar correctamente",
  "clasificado por Google aunque su nombre no mencione la especialidad.",
  "",
  "| Nombre | Especialidad | Zona | Tipo Google | Dirección |",
  "|---|---|---:|---|---|",
  ...reviewCandidates.map(
    (doctor) =>
      `| ${doctor.nombre.replaceAll("|", "\\|")} | ${doctor.especialidad} | ${doctor.zona} | ${doctor.tipo_principal_google || "Sin tipo principal"} | ${doctor.direccion.replaceAll("|", "\\|")} |`,
  ),
  "",
];

const csvHeader = [
  "nombre",
  "especialidad",
  "zona",
  "direccion",
  "telefono",
  "sitio_web",
  "place_id",
  "fecha_recoleccion",
  "keyword_usado",
  "tipo_principal_google",
  "tipos_google",
];
const csvEscape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csv = [
  csvHeader.join(","),
  ...doctors.map((doctor) =>
    csvHeader
      .map((field) =>
        csvEscape(
          Array.isArray(doctor[field]) ? doctor[field].join(";") : doctor[field],
        ),
      )
      .join(","),
  ),
].join("\n");

await mkdir(fileURLToPath(outputDirectory), { recursive: true });
await Promise.all([
  writeFile(new URL("cobertura.md", outputDirectory), `${lines.join("\n")}\n`),
  writeFile(new URL("directorio.csv", outputDirectory), `${csv}\n`),
  writeFile(
    new URL("directorio.json", outputDirectory),
    `${JSON.stringify({ fecha_exportacion: generatedAt, datos: doctors }, null, 2)}\n`,
  ),
]);

console.log(
  `Reporte generado: ${doctors.length} registros, ${reviewCandidates.length} para revisión humana.`,
);
