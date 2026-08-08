import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import type { Query } from "firebase-admin/firestore";

import type { Medico, MedicoFirestore } from "../types/medico";
import { normalizeForSearch } from "../utils/validation";

const collectionName = "medicos";

interface DirectoryFilters {
  page: number;
  pageSize: number;
  specialty?: string;
  zone?: string;
}

interface DirectoryResult {
  data: Medico[];
  hasNext: boolean;
}

export async function saveDoctors(doctors: MedicoFirestore[]): Promise<void> {
  if (doctors.length === 0) {
    return;
  }

  const database = getFirestore();
  const batch = database.batch();

  for (const doctor of doctors) {
    const reference = database.collection(collectionName).doc(doctor.place_id);
    batch.set(
      reference,
      {
        ...doctor,
        fecha_recoleccion: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
}

export async function reconcileSearchResults(
  keywordUsed: string,
  doctors: MedicoFirestore[],
): Promise<number> {
  const database = getFirestore();
  const currentIds = new Set(doctors.map((doctor) => doctor.place_id));
  const previousResults = await database
    .collection(collectionName)
    .where("keyword_usado", "==", keywordUsed)
    .get();
  const staleDocuments = previousResults.docs.filter(
    (document) => !currentIds.has(document.id),
  );

  for (let offset = 0; offset < staleDocuments.length; offset += 500) {
    const batch = database.batch();
    for (const document of staleDocuments.slice(offset, offset + 500)) {
      batch.delete(document.ref);
    }
    await batch.commit();
  }

  await saveDoctors(doctors);
  return staleDocuments.length;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function listDoctors(
  filters: DirectoryFilters,
): Promise<DirectoryResult> {
  const database = getFirestore();
  let query: Query = database.collection(collectionName);

  if (filters.specialty) {
    query = query.where(
      "especialidad_busqueda",
      "==",
      normalizeForSearch(filters.specialty),
    );
  }
  if (filters.zone) {
    query = query.where("zona_busqueda", "==", filters.zone);
  }

  const offset = (filters.page - 1) * filters.pageSize;
  const snapshot = await query
    .orderBy("nombre_busqueda")
    .offset(offset)
    .limit(filters.pageSize + 1)
    .get();
  const hasNext = snapshot.docs.length > filters.pageSize;

  const data = snapshot.docs.slice(0, filters.pageSize).map((document) => {
    const doctor = document.data();
    const collectionDate = doctor.fecha_recoleccion;

    return {
      nombre: stringValue(doctor.nombre),
      especialidad: stringValue(doctor.especialidad),
      direccion: stringValue(doctor.direccion),
      telefono: stringValue(doctor.telefono),
      sitio_web: stringValue(doctor.sitio_web),
      zona: stringValue(doctor.zona),
      place_id: stringValue(doctor.place_id) || document.id,
      fecha_recoleccion:
        collectionDate instanceof Timestamp
          ? collectionDate.toDate().toISOString()
          : null,
      keyword_usado: stringValue(doctor.keyword_usado),
      tipo_principal_google: stringValue(doctor.tipo_principal_google),
      tipos_google: stringArray(doctor.tipos_google),
    };
  });

  return { data, hasNext };
}
