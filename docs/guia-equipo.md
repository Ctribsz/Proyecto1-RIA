# Guía del equipo

## Qué está funcionando

- UI desplegada: `https://ria-proyecto1.web.app`.
- Functions `holaMundo` y `api` activas en `us-central1`.
- Firestore Native con colección `medicos` e índices desplegados.
- Places API (New), Secret Manager, billing, alertas y cuotas configurados.
- Direct VPC egress, Cloud NAT e IP fija activos; la key productiva está
  restringida a Places API y a los orígenes de la infraestructura.
- Whitelist probada desde redes autorizadas y no autorizadas.
- Dataset final: 215 registros. No ejecutar nuevamente la matriz completa.

## Acceso desde cada computadora

No se necesitan cuatro keys para usar el despliegue. Existe una sola key de
producción en Secret Manager. `ALLOWED_IPS` controla quién entra a la Function;
no es la restricción de la key. Cada integrante obtiene sus IPs públicas:

```bash
curl -4 https://api.ipify.org
curl -6 https://api64.ipify.org
```

La llamada IPv6 puede fallar si la red no la soporta. Christian agrega las IPs
disponibles, separadas por comas, a `functions/.env.ria-proyecto1` y despliega:

```bash
npm --prefix functions run typecheck
npx firebase deploy --config firebase.json --only functions --project ria-proyecto1
```

No usar IPs privadas (`192.168.x.x`, `10.x.x.x`, `172.16.0.0/12`, `127.0.0.1`
ni `::1`). Si una IP residencial cambia, el integrante recibirá 403 y debe
enviar sus nuevas IPv4 e IPv6. Esto actualiza `ALLOWED_IPS`, no la key
productiva. La restricción de esa key usa exclusivamente las direcciones de
salida de la infraestructura:
`34.68.66.250` y `fda3:e722:ac3:10:25d:5ef0:a2a:0/120`.

Para Places real en local se usa una key de desarrollo separada, restringida a
la IP pública local y a Places API, guardada en `.secret.local`. Si pertenece a
`ria-proyecto1`, comparte su billing y cuota; nunca se copia la key productiva.

## Verificación y despliegue

```bash
npm --prefix functions install
npm --prefix functions test
npm --prefix functions run typecheck
npm --prefix functions run test:integration
npm --prefix functions audit --omit=dev
npx firebase deploy --only functions,firestore,hosting --project ria-proyecto1

# Evidencia selectiva; no imprime la key ni ALLOWED_IPS
gcloud functions describe api --v2 --region=us-central1 --project=ria-proyecto1 --format='yaml(state,updateTime,serviceConfig.revision,serviceConfig.directVpcNetworkInterface,serviceConfig.directVpcEgress,serviceConfig.maxInstanceCount)'
gcloud compute addresses describe ria-egress-ip --region=us-central1 --project=ria-proyecto1 --format='yaml(name,address,status)'
gcloud compute routers nats describe ria-egress-nat --router=ria-egress-router --region=us-central1 --project=ria-proyecto1 --format='yaml(name,natIpAllocateOption,natIps,subnetworks)'
gcloud services api-keys describe projects/182057033707/locations/global/keys/6e5f0339-e4fc-47a3-a825-cb81bc7e94d0 --project=ria-proyecto1 --format='yaml(displayName,uid,restrictions)'
```

No desplegar por rutina. Cada despliegue crea imágenes y puede generar costo. La
política de Artifact Registry elimina imágenes mayores a cuatro días.
Sanitizar cualquier salida adicional antes de publicarla: una descripción
completa de la Function puede incluir las IPs residenciales de `ALLOWED_IPS`.

## Demo de 20 minutos

1. Contexto, alcance y postura ética: 3 minutos.
2. Arquitectura, billing, cuotas, secreto, whitelist y salida VPC: 4 minutos.
3. Estrategia y cobertura del dataset: 4 minutos.
4. Demo de UI, filtros y paginación: 4 minutos.
5. Mostrar 200 autorizado y captura del 403 no autorizado: 2 minutos.
6. Limitaciones, conclusiones y preguntas: 3 minutos.

Usar datos ya recolectados. Si se demuestra `POST /recolectar`, hacer una sola
búsqueda preparada y recordar que el límite es 20. No revelar la key, tokens,
datos completos de billing ni IPs residenciales. La IP NAT y el rango privado
pueden mostrarse como evidencia técnica, pero nunca el valor de la key.

## Tareas finales

- Diego: ordenar las capturas de billing, cuotas, 200 y 403.
- Diederich: revisar visualmente candidatos de `docs/datos/cobertura.md` sin borrar automáticamente ni ejecutar Places.
- Andy: preparar documento final/diapositivas con `documentacion-tecnica.md` y el reporte de cobertura.
- Christian: administrar secreto, whitelist, despliegue y ensayo técnico.

## Contingencia

- Probar red e IP de presentación el mismo día.
- Llevar capturas del 200, 403, Firestore y UI.
- Mantener disponibles `docs/datos/directorio.csv` y `directorio.json`.
- Si Places falla, demostrar con Firestore ya poblado; la consulta no consume Places.
