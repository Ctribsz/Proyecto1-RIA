const { readFile } = require("node:fs/promises");
const { initializeApp } = require("firebase-admin/app");
const { Timestamp, getFirestore } = require("firebase-admin/firestore");

const projectId = "ria-proyecto1";
const emulatorHost = "127.0.0.1:8080";

// Este script nunca debe apuntar a producción.
process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
initializeApp({ projectId });

function normalizeForSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-GT")
    .replace(/\s+/g, " ");
}

async function main() {
  const sourceUrl = new URL("../docs/datos/directorio.json", `file://${__dirname}/`);
  const payload = JSON.parse(await readFile(sourceUrl, "utf8"));
  const doctors = Array.isArray(payload.datos) ? payload.datos : [];

  if (doctors.length === 0) {
    throw new Error("El export no contiene médicos.");
  }

  const database = getFirestore();
  for (let offset = 0; offset < doctors.length; offset += 500) {
    const batch = database.batch();

    for (const doctor of doctors.slice(offset, offset + 500)) {
      if (!doctor.place_id) throw new Error("Registro sin place_id.");

      const collectionDate = new Date(doctor.fecha_recoleccion);
      if (Number.isNaN(collectionDate.getTime())) {
        throw new Error(`Fecha inválida para ${doctor.place_id}.`);
      }

      batch.set(database.collection("medicos").doc(doctor.place_id), {
        ...doctor,
        fecha_recoleccion: Timestamp.fromDate(collectionDate),
        especialidad_busqueda: normalizeForSearch(doctor.especialidad),
        nombre_busqueda: normalizeForSearch(doctor.nombre),
        zona_busqueda: doctor.zona,
      });
    }

    await batch.commit();
  }

  const snapshot = await database.collection("medicos").count().get();
  const total = snapshot.data().count;
  if (total !== doctors.length) {
    throw new Error(`Se esperaban ${doctors.length} registros y se cargaron ${total}.`);
  }

  console.log(`Firestore Emulator cargado con ${total} médicos.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
