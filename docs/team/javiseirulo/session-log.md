# Notas de sesión — javiseirulo

## 2026-11-14 — Sesión 1: contexto
- Repo clonado (estaba vacío). Se scrapearon el reto, Global Offers (requiere login → pendiente), Resources y las guías de FAQ / Submission / Judging / Team Formation.
- Hallazgo clave: **hoy 14 nov abre la entrega y cierra el 15 nov 23:59 hora local** → el calendario es de ~1 día.
- Hallazgo clave: las reglas prohíben usar IA para idear la solución → la idea la ponemos los humanos; gstack se usa para cuestionarla/refinarla/construirla.
- Hallazgo: existe `Softsasi/LunaMission` (posible equipo del mismo reto) → diferenciarse (ver `docs/05-prior-art.md`).
- Datos más útiles: Horizons API/SPICE (Sol/Tierra), LOLA 5 m del polo sur (Barker et al.), Moon Trek WMTS.
- Siguiente: javi escribe su idea en `docs/ideas/`; cada compañero la suya; luego `/office-hours`.

## 2026-11-14 — Sesión 2: plan de efemérides y scoring
- Plan detallado añadido a `docs/10-plan-tecnico.md` §5 Javi (J1–J11), sin tocar los bloques de los demás.
- Hallazgo: Moon Trek WMTS sirve imágenes renderizadas (no valores) → para mostrar/validar; el DEM numérico y los perfiles de horizonte los produce Pablo (PGDA/PDS).
- Pendiente: PR de contrato v1.1 (aditivo) y empezar #39 (efemérides SPICE + validación Horizons) en rama desde `dev`.

## 2026-11-14 — Sesión 2b: selector de modo de tiempo (#65)
- `web/src/scoring/`: `DEFAULT_MISSION_CONFIG`, `computeArrival` (Hohmann con distancia Tierra–Luna de Meeus, LLO polar, espera por traza, descenso), `MissionTimingPanel` montado en Explore encima del Mission Clock.
- `missionConfig` en el store (quinto campo) y tipo `MissionConfig` en `contracts/types.ts`.
- Verificado: lint, typecheck, 24 tests, build y navegador (escritorio y 375 px; sin errores de consola).
- Matiz físico: con plano orbital fijo (`start_in_orbit`), solo los sitios a ≲1° del polo se alcanzan en cada órbita; a 85°S la espera también puede ser de días.
