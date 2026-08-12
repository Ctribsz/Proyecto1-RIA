const assert = require("node:assert/strict");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ projectId: "ria-proyecto1" });

async function main() {
  for (let index = 1; index <= 3; index += 1) {
    await getFirestore().collection("medicos").doc(`place-${index}`).set({
      nombre: `Clínica ${index}`,
      especialidad: "Cardiología",
      direccion: `Dirección ${index}`,
      telefono: "",
      sitio_web: "",
      zona: "10",
      place_id: `place-${index}`,
      keyword_usado: "cardiólogo zona 10",
      tipo_principal_google: "doctor",
      tipos_google: ["doctor", "health"],
      especialidad_busqueda: "cardiologia",
      nombre_busqueda: `clinica ${index}`,
      zona_busqueda: "10",
    });
  }

  const endpoint = new URL(
    "http://127.0.0.1:5001/ria-proyecto1/us-central1/api/directorio",
  );
  endpoint.search = new URLSearchParams({
    especialidad: "Cardiología",
    zona: "10",
    page: "1",
    pageSize: "2",
  }).toString();
  const response = await fetch(endpoint, {
    headers: { Origin: "http://127.0.0.1:5000" },
  });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.datos.length, 2);
  assert.equal(body.paginacion.hasNext, true);
  assert.equal(body.datos[0].especialidad, "Cardiología");
}

main();
