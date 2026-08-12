# Directorio de Médicos Especialistas

Proyecto de CC3106 Responsible AI para recolectar, almacenar y consultar
médicos especialistas de Ciudad de Guatemala. Usa TypeScript, Firebase
Functions v2, Firestore, Google Places API (New) y Firebase Hosting.

## Integrantes

- Diego Linares 221256
- Diederich Solis
- Christian Echeverria
- Andy Fuentes

## Estado

El sistema está desplegado y validado:

- UI: https://ria-proyecto1.web.app
- API: https://us-central1-ria-proyecto1.cloudfunctions.net/api
- Dataset: 215 registros únicos, 5 especialidades, 7 zonas y 20 combinaciones.
- Seguridad: IP whitelist, Secret Manager, CORS y Firestore sin acceso directo.
- Calidad: 15 pruebas automatizadas y 0 vulnerabilidades de producción.

## Inicio rápido

Requisitos: Node.js 22, Java 11 o superior y Firebase CLI.

```bash
npm --prefix functions install
cp functions/.env.example functions/.env.local
cp functions/.secret.local.example functions/.secret.local
npm --prefix functions test
npm --prefix functions run test:integration
npm --prefix functions run serve
```

La UI local queda en `http://127.0.0.1:5000` y Emulator UI en
`http://127.0.0.1:4000`. Una clave local solo es necesaria para probar Places
desde el emulador; el despliegue compartido usa Secret Manager.

## Operación

```bash
# Consultar
curl "https://us-central1-ria-proyecto1.cloudfunctions.net/api/directorio?page=1&pageSize=10&especialidad=Cardiología&zona=10"

# Recolectar, únicamente desde una IP autorizada
curl -X POST \
  "https://us-central1-ria-proyecto1.cloudfunctions.net/api/recolectar" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"cardiólogo","especialidad":"Cardiología","zona":"10"}'
```

No volver a ejecutar la matriz completa salvo que el equipo acuerde actualizar
los datos y revise previamente la cuota. Para regenerar exports sin consumir
Places se usa `node scripts/report-coverage.mjs`.

## Documentación

- [Documentación técnica](docs/documentacion-tecnica.md): entregable técnico consolidado.
- [Guía del equipo](docs/guia-equipo.md): acceso, despliegue, demo y reparto final.
- [Reporte de cobertura](docs/datos/cobertura.md): métricas y revisión visual.
- [CSV](docs/datos/directorio.csv) y [JSON](docs/datos/directorio.json): exports fechados.
