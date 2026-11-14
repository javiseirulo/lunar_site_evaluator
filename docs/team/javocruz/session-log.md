# Notas de sesión — javocruz (rol Javi2: web, estética, layers)

## 2026-11-14 — Sesión 1: esqueleto web v0
- Rama `javocruz/36-web-shell`. Sigue el plan técnico por persona (ahora en `docs/10-plan-tecnico.md`), no el reparto A–E de los issues (ver decisión en `docs/decisions/log.md`).
- gstack no estaba instalado en esta máquina; se trabajó sin él (pendiente instalar).
- Hecho:
  - Monorepo pnpm (`web/`, `contracts/`), Node 22 fijado por `.npmrc`.
  - `contracts/types.ts` + JSON Schemas + `pnpm mocks` (20 sitios, 30 días horarios desde 2027-01-01, 5 capas PNG). Todo mock, marcado `"mock": true` y con badge "Mock data" en la UI.
  - `web/src/core`: store zustand (4 campos del contrato + opacidad de capas), carga de datos con caché de timeseries, router con lazy-load, sincronización URL ↔ `mode`, helpers (sampleAt, tiempo hasta Sunset/Earthset, proyección polar, coloreado de PNG).
  - Shell: barra superior + navegación móvil, landing, About/créditos/declaración IA (sin branding NASA), barra temporal compartida con play y ventanas de Sol/Tierra del sitio.
  - Capas: panel (mostrar, opacidad, orden, leyenda, info), leyenda flotante, mapa polar 2D con pins y retícula.
  - Placeholders para Marta (`globe/`, con lista y ficha de sitio de arranque), Pablo (`streetview/`) y Cristóbal (`game/`).
  - Tests (vitest): store, helpers de timeseries y validación de `public/data` contra el contrato. CI en `.github/workflows/web.yml`.
- Verificado: lint, typecheck, 12 tests, build, y en navegador (escritorio y móvil 375 px): seleccionar sitio → ficha → "Street View" navega a `/streetview/<id>`, play avanza el tiempo, capas se apilan, deep links funcionan.
- Siguiente (v1): design system con shadcn/ui, onboarding, deploy público (Vercel con raíz `web/`), y acordar con el equipo qué plan manda.

## 2026-11-14 — Sesión 1 (cont.): rama dev y documentación para el equipo
- PR #53 mergeado en `main` (squash). Creada la rama `dev` como integración; PR #54 cambia CLAUDE.md, protocolo, README, plantilla de PR, `sync-docs.sh` y CI para trabajar contra `dev`.
- El plan técnico pasa de mi carpeta a `docs/10-plan-tecnico.md`, con una sección 0 de estado real y las diferencias entre el código y el plan, para que las IAs de los demás lo lean al empezar.
- Corrección: el CI sí corre en los PR antes de mergear (en el #53 pasó).
- Rediseño del front: estilo portal de los 2000 (referencia: portadas web institucionales 2003–2007), cabecera con buscador "Find a site", pestañas, barra de estado, portada tipo portal (sitio destacado, datos rápidos, boletines), Explore y About rehechos, fuentes del sistema. Rama `javocruz/portal-redesign`.
- Rediseño v2 (petición: menos apretado y más claramente "portal de los 2000"): más espacio y texto algo mayor; pestañas nuevas Sites, Compare y Learn; barra de públicos y franja EVENTS; portada con rejilla de temas (las de mapa abren Explore con esa capa activada). Pendiente: el texto de Learn lo debería revisar alguien del equipo.
