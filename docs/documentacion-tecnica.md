# Documentación técnica

## 1. Objetivo y alcance

El sistema crea un directorio académico de médicos especialistas de Ciudad de
Guatemala a partir de Google Places API (New). Recolecta nombre, especialidad,
dirección, teléfono, sitio web, zona, `place_id`, fecha y keyword; almacena los
datos en Firestore y los expone mediante una API paginada y una UI mínima.

Tecnologías: TypeScript, Node.js 22, Firebase Functions v2, Cloud Firestore,
Firebase Hosting, Secret Manager, Direct VPC egress, Cloud NAT y Local Emulator
Suite. El despliegue está en `ria-proyecto1`:

- UI: `https://ria-proyecto1.web.app`
- API: `https://us-central1-ria-proyecto1.cloudfunctions.net/api`

## 2. Arquitectura y seguridad

```mermaid
flowchart LR
    U[Usuario autorizado] --> H[Firebase Hosting: UI]
    H -->|GET /directorio| A[Cloud Function API]
    O[Operador autorizado] -->|POST /recolectar| A
    A --> W{IP whitelist}
    W -->|GET /directorio| F[(Firestore)]
    W -->|POST /recolectar| V[Direct VPC egress]
    V --> G[Private Google Access: rango /120]
    G --> P[Places API New]
    V -. otros destinos públicos .-> N[Cloud NAT]
    N --> I[IP pública fija]
    P --> A
    A --> F
    S[Secret Manager] --> A
```

Hosting sirve archivos estáticos y el navegador llama directamente a la
Function para conservar la IP del usuario. La whitelist es el primer middleware
de la aplicación: una dirección no autorizada recibe HTTP 403 antes de acceder
a Places o Firestore. Se verificaron solicitudes autorizadas y no autorizadas.
CORS acepta únicamente los dominios de Hosting del proyecto y el emulador.

La key productiva de Places está en Secret Manager, nunca en código, Git ni el
navegador. Combina restricción de API a `places.googleapis.com` con restricción
de aplicación a `34.68.66.250` y al rango
`fda3:e722:ac3:10:25d:5ef0:a2a:0/120`. La Function envía todo el tráfico por la
red `ria-egress` y la subred `ria-egress-us-central1`. Cloud NAT entrega la IP
pública fija a destinos externos; las APIs de Google evitan Public NAT mediante
Private Google Access y observan el rango IPv6 interno asignado a la interfaz
Direct VPC. Por eso ambos orígenes están autorizados. Este comportamiento está
documentado en las
[interacciones de Cloud NAT](https://cloud.google.com/nat/docs/nat-product-interactions).

La whitelist residencial de entrada y la restricción de salida de la key son
controles distintos. Si cambia la IP de un integrante, se actualiza
`ALLOWED_IPS`, no la key productiva. El emulador usa una key de desarrollo
separada, limitada a la IP pública local y a Places API. Firestore rechaza toda
lectura y escritura directa de clientes; solo Firebase Admin dentro de la
Function tiene acceso.

### Evidencia del punto 7

- Proyecto y región: `ria-proyecto1`, `us-central1`.
- Revisión validada: `api-00010-jis`, estado `ACTIVE`, desplegada el
  `2026-08-12T17:59:31Z`.
- Salida: `VPC_EGRESS_ALL_TRAFFIC`; red `ria-egress`; subred
  `ria-egress-us-central1` (`10.42.0.0/24`); máximo 3 instancias.
- Router/NAT/IP: `ria-egress-router`, `ria-egress-nat`, recurso
  `ria-egress-ip`, dirección `34.68.66.250`.
- Key: `places-directorio-backend`, UID
  `6e5f0339-e4fc-47a3-a825-cb81bc7e94d0`; su valor no se documenta ni se imprime
  en los comandos de evidencia.
- Restricciones verificadas: API `places.googleapis.com`; orígenes
  `34.68.66.250` y `fda3:e722:ac3:10:25d:5ef0:a2a:0/120`.
- Prueba final del `POST /recolectar`: HTTP 201, cero guardados y cero
  eliminados con una keyword imposible; la ruta funcionó y no mutó el dataset.

## 3. API y modelo de datos

`POST /recolectar` recibe `keyword`, `zona` y opcionalmente `especialidad`.
Realiza exactamente una Text Search con máscara explícita y `pageSize: 20`; no
sigue páginas adicionales. Usa `place_id` como ID de documento, por lo que una
búsqueda repetida actualiza en lugar de duplicar. También elimina resultados
obsoletos de la misma keyword. Es una operación administrativa y no se invoca
desde el frontend público.

`GET /directorio` acepta `page`, `pageSize` (máximo 50), `especialidad` y
`zona`. Normaliza los filtros, ordena por nombre y devuelve datos, página,
tamaño y `hasNext`. Firestore tiene índices para especialidad, zona y ambos
filtros combinados.

Documento `medicos/{place_id}`:

```text
nombre, especialidad, direccion, telefono, sitio_web, zona, place_id,
fecha_recoleccion, keyword_usado, tipo_principal_google, tipos_google
```

Los dos campos de tipos conservan metadatos originales de Google para auditoría.
Los campos auxiliares normalizados de búsqueda no se exponen como datos médicos.

## 4. Estrategia, costos y calidad

Se documentó una matriz antes de recolectar: `cardiólogo`, `pediatra`,
`dermatólogo`, `ginecólogo` y `neurólogo`, combinados con cuatro zonas relevantes
por especialidad. El script ejecuta 20 búsquedas con siete segundos de pausa,
por debajo de 10 solicitudes por minuto. Se completaron 44 búsquedas exitosas
durante configuración, validación y depuración, dentro de la cuota diaria de 100.
El emulador se usó para pruebas; producción se reservó para integración y demo.

La máscara actual incluye teléfono y sitio web, por lo que activa Text Search
Enterprise. Al 12 de agosto de 2026, Google publica 1,000 eventos mensuales sin
costo y luego USD 35 por 1,000 en el primer nivel; deben revisarse siempre las
[tarifas vigentes de Places](https://developers.google.com/maps/billing-and-pricing/pricing).
La dirección usada por Cloud NAT cuesta USD 0.005 por hora (aprox. USD 3.65 por
30.4 días) solo por la IP. Además se cobran el gateway por instancia-hora, los
datos procesados y el egreso aplicable. Véase la
[tarifa de Cloud NAT](https://cloud.google.com/nat/pricing). Las alertas, cuota
diaria de 100 y `maxInstances: 3` limitan la exposición, pero no sustituyen la
revisión del reporte de facturación.

El dataset final contiene 215 `place_id` únicos, cinco especialidades, siete
zonas y las 20 combinaciones planificadas. Hay 16 teléfonos y 99 sitios web
vacíos; no se rellenaron. Los sitios de redes sociales se descartan sin inferir
un reemplazo. Los exports incluyen fecha de recolección.

Validaciones aplicadas: coordenadas dentro de Ciudad de Guatemala, concordancia
de zona cuando Google la indica, categoría médica devuelta por Google y lista
auditable de seis exclusiones confirmadas. No se fusionaron aliases con distintos
`place_id`, porque hacerlo implicaría inferir identidad. El reporte
`docs/datos/cobertura.md` conserva 68 candidatos para revisión visual; no son
errores confirmados y no se eliminan automáticamente.

## 5. Postura ética y limitaciones

El directorio es una referencia académica, no certifica credenciales ni
sustituye una recomendación médica. `especialidad` y `zona` describen la
estrategia de búsqueda, no una verificación independiente. Solo se guardan datos
de Places y metadatos de recolección; no se agregan ni infieren teléfonos,
direcciones, sitios o identidades.

Los datos pueden estar incompletos o desactualizados. La UI muestra la fecha y
advierte esta limitación. Los resultados son los primeros lugares de Text Search,
no un censo exhaustivo. Google puede devolver direcciones o categorías
inconsistentes, por lo que se mantiene revisión humana conservadora.

Los términos de Google Places limitan almacenamiento y redistribución. Este uso
es exclusivamente académico; convertirlo en producto requeriría revisar los ToS
vigentes, condiciones comerciales, actualización periódica y mecanismos de
corrección o retiro.
