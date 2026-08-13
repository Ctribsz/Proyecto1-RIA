# Directorio de Médicos Especialistas

Proyecto de CC3106 Responsible AI para recolectar, almacenar y consultar
médicos especialistas de Ciudad de Guatemala. Usa TypeScript, Firebase
Functions v2, Firestore, Google Places API (New), Firebase Hosting, Direct VPC
egress y Cloud NAT.

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
- Seguridad: whitelist de entrada, Secret Manager, salida por VPC, key limitada
  a Places API y a las IPs de la infraestructura, CORS y Firestore sin acceso
  directo.
- Calidad: 15 pruebas automatizadas y 0 vulnerabilidades de producción.

## Inicio rápido

Requisitos: Node.js 22, Java 21 o superior y Firebase CLI.

```bash
npm --prefix functions install
cp functions/.env.example functions/.env.local
cp functions/.secret.local.example functions/.secret.local
npm --prefix functions test
npm --prefix functions run test:integration
npm --prefix functions run serve
```

La UI local queda en `http://127.0.0.1:5002` y Emulator UI en
`http://127.0.0.1:4000`. Una clave local solo es necesaria para probar Places
desde el emulador: debe ser una key separada, limitada a la IP pública del
desarrollador y a Places API, y guardarse en `.secret.local`. Producción usa
otra key en Secret Manager, limitada a la IP pública NAT y al rango IPv6 interno
que Google APIs observa desde Direct VPC.

Para cargar los 215 registros exportados sin consumir Places, deja los
emuladores ejecutándose y, en otra terminal, usa:

```bash
npm --prefix functions run seed:emulator
```

## Operación

Cuando una búsqueda del frontend no encuentra resultados y contiene tanto
especialidad como zona, la UI solicita una recolección al backend y vuelve a
consultar el directorio automáticamente. Cada combinación se intenta una sola
vez por sesión de la página para evitar solicitudes repetidas a Places.

```bash
# Consultar
curl "https://us-central1-ria-proyecto1.cloudfunctions.net/api/directorio?page=1&pageSize=10&especialidad=Cardiología&zona=10"

# Recolectar: muta Firestore y puede ser cobrable; usar solo desde una IP autorizada
curl -X POST \
  "https://us-central1-ria-proyecto1.cloudfunctions.net/api/recolectar" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"cardiólogo","especialidad":"Cardiología","zona":"10"}'
```

No volver a ejecutar la matriz completa salvo que el equipo acuerde actualizar
los datos y revise previamente la cuota. Para regenerar exports sin consumir
Places se usa `node scripts/report-coverage.mjs`.

Infraestructura de salida en `us-central1`: red `ria-egress`, subred
`ria-egress-us-central1`, router `ria-egress-router`, NAT `ria-egress-nat` e IP
reservada `ria-egress-ip`. Google APIs observa además el rango privado
`fda3:e722:ac3:10:25d:5ef0:a2a:0/120`, asignado a la interfaz Direct VPC de la
revisión; se autoriza el rango porque las direcciones individuales son efímeras.

## Documentación

- [Documentación técnica](docs/documentacion-tecnica.md): entregable técnico consolidado.
- [Guía del equipo](docs/guia-equipo.md): acceso, despliegue, demo y reparto final.
- [Reporte de cobertura](docs/datos/cobertura.md): métricas y revisión visual.
- [CSV](docs/datos/directorio.csv) y [JSON](docs/datos/directorio.json): exports fechados.
