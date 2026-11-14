# Reconciliación del plan técnico de Pablo — issue #59

2026-11-14 · @pabloizgui · Asistencia de OpenAI Codex.

## Fuentes de contexto

- Solicitud actual: actualizar desde GitHub sin perder datos locales, comparar el
  plan compartido con el otro chat y publicar el plan actualizado con issue.
- Chat «Proponer enfoques educativos lunares», última revisión del bloque de Pablo.
- `origin/main`: `911407a`, incorpora shell/contratos/mocks del PR #53.
- Base de coordinación: `origin/dev` en `3cc91ef`; incorpora #54 (plan/ramas),
  #55 (Mission) y #56 (sección de Marta).
- Archivo canónico encontrado: `docs/10-plan-tecnico.md` en `dev`. No había un
  archivo llamado `docs/plantecnico.md` en las referencias consultadas.

## Qué llegó desde GitHub

El pull desde `dev` adelantó la rama local desde `8e8f964` a `3cc91ef`: 104 archivos
con cambios. Entraron monorepo pnpm, lockfile, contratos/esquemas, 20 sitios mock,
30 días horarios, cinco capas, shell React, store, rutas, TimeBar, mapa polar 2D,
pruebas/CI, módulos vacíos y el plan compartido actualizado por los compañeros.
Los PRs abiertos al consultar eran #57 (notas Mission) y #58 (consistencia de mocks);
no se consideran integrados por estar abiertos.

## Decisiones para el bloque de Pablo

| Tema | Plan compartido previo | Reconciliación |
| --- | --- | --- |
| Motor de Street View | three.js, plano con heightmap | Cesium Moon prioritario con prueba de viabilidad; contingencia local three.js si falla |
| Motor de Marta | three.js/R3F | Se conserva sin migración ni cambios en su bloque |
| Topografía propia | Recortes/PNG16 y horizonte | Ciencia independiente, recortes y horizonte; además heightmap polar Float32 para Marta |
| Cobertura de Marta | Ventana hasta −80°, bounds de layers | PGDA 81 de 87–90°S no basta: seleccionar/validar DEM complementario y declarar NoData |
| Distribución | Archivos estáticos | Ciencia estática; la geometría visual Cesium depende de red/ion |
| Estado y tiempo | Store y series v1 | Se conservan; detectar fuera de rango y mostrar muestra usada |
| Alturas | Heightmap PNG16 | Intercambio PNG16 válido con decoder; Float32 para el parche, no Canvas gray8 para alturas precisas |
| Coordenadas libres | No resueltas | Cámara libre no reutiliza ciencia de otro sitio; extensión futura con Javi/Javi2 |
| Cielo/educación | Mezclado con primer prototipo | Terreno + Sol/Tierra primero; estrellas después; QR posterior; sin sincronización de clase |

La actualización modifica el bloque de Pablo y referencias comunes que lo
contradecían. Las secciones de Javi, Marta, Javi2 y Cristóbal se conservan idénticas
a la base leída. El nuevo §9 expone dependencias para revisión; no atribuye a esos
compañeros una aprobación aún no recibida. No se modifican los contratos ni el código.

## Comprobaciones

- Copia de seguridad con SHA-256 de 15 archivos locales antes del pull y stash
  conservado. Conflictos de recursos/índice/SI resueltos conservando aportaciones
  remotas y locales. Las notas y el código de terreno permanecen locales.
- El gstack del perfil de Codex está instalado: comprobación del adaptador Codex
  de la rama #5 devuelve OK. El script antiguo de la base solo busca Claude;
  no se interpreta su falso negativo como ausencia de gstack.
- Contraste estático con `contracts/types.ts`, exports de `@/core`, `sampleAt`,
  `StreetViewPage.tsx` y placeholder de Street View.
- Herramientas locales de terreno: **12 pruebas correctas** con el entorno corto
  `lunar-terrain-venv` que ya empleaba el otro chat. El primer intento sin ese
  entorno falló por sockets del sandbox y falta de rasterio; no fue un fallo de
  los datos ni se cambió el código para ocultarlo. Hay advertencias de dependencias.
- No se ha probado todavía el acceso a Cesium ion, un render Cesium, las sombras,
  un horizonte real ni el rendimiento móvil. El plan los mantiene como trabajo futuro.
- No se requieren pruebas nuevas del producto para esta modificación documental.

## Publicación prevista

Rama `pabloizgui/59-alinear-plan-tecnico`, PR contra `dev`, commit con `Refs #59`
y descripción de compatibilidad y validación. Únicamente documentación relativa
a esta reconciliación; sin código local, datasets, credenciales o cambios ajenos.
No hacer push directo a `main`/`dev` ni asumir el OK de los responsables afectados.

Referencias técnicas verificadas: [Cesium Moon](https://cesium.com/platform/cesium-ion/content/cesium-moon/)
y [PGDA 81](https://pgda.gsfc.nasa.gov/products/81). Versiones y contratos efectivos
son los de `dev`, no las versiones orientativas del primer borrador.
