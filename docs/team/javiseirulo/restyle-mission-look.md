# Restyle de toda la web al look de Mission (sesión desatendida, 2026-11-15 ~03:10)

> **Actualización 2026-11-15:** ya está en `dev` vía **#101** (junto con el PR #97 de Marta y el terreno de Pablo). Lo de abajo es el registro original de la sesión.

Rama original `javiseirulo/restyle-mission-look` (desde `origin/dev` @ 0e6ddab).
Idea y dirección: Javi (estética de Cristóbal en toda la web, minimalista, Normal/Experto). IA: Claude Code.

## 0. Verificación del repo (antes de tocar nada)
- `origin/dev` ya contiene el módulo Mission de Cristóbal (#85, su rama se borró) además de #80-#83 (Explore v1, heat-map grids, SiteCheck).
- En un worktree limpio de `dev`: **197 tests OK, typecheck OK, lint OK, build OK**.
- Recorrido con `/browse` de `/`, `/explore`, `/compare`, `/sites`, `/learn`, `/streetview`, `/game`, `/about`: todas renderizan, sin errores de consola.
- Detectado en `dev` (no arreglado salvo lo indicado): panel "Mission requirements" cortado en Explore (**arreglado**: era `max-h-[300px]`); "Mock data" aunque `manifest.mock=false` (es `layers.json` con `mock:true`; ahora se llama "Mock layers" y solo sale en Experto); todos los sitios con score 100 y `slope` 0.0° en Compare (datos de terreno pendientes).
- PRs abiertos de Marta (#86, #89, capa "Past landings") no están en `dev`; tocarán `ExplorePage.tsx`/globo y pueden dar conflicto con este cambio.

## 1. Qué cambia
- `web/src/index.css`: tema global = tokens de Mission (navy, ámbar, mono, borde duro 2px + sombra 4px). Todo lo que usa tokens se re-tematiza solo. Nuevas clases `.seg`, `.eyebrow`.
- Navegación: Normal = Explore, Compare, Mission, Learn + interruptor **Normal | Experto**. Experto añade Sites, Street View, Data, buscador de sitio y pie completo (`core/navigation.ts`, `Masthead.tsx`, `Footer.tsx`).
- Landing: una frase, un botón principal ("Explore the map") y uno secundario; el grid de 7 tarjetas solo en Experto.
- Explore: Normal = lista de sitios + mapa + reloj + ficha reducida (`pages/explore/SimpleSiteList.tsx`). Experto = todo lo anterior (requisitos, capas, Mission Timing, SiteCheck).
- Mission: el selector Normal/Expert del menú es el **mismo** interruptor global (`MissionGame.tsx`, `MenuScreen.tsx`). `GamePage` ya no envuelve el juego en una caja con título.
- `GlobeCard.tsx`, `PinForm.tsx`, `PolarMap.tsx`, `SiteList.tsx`: ajustes de color por el cambio de fondo (texto negro sobre ámbar).
- `DESIGN.md` en la raíz con el sistema.
- `MissionFx.tsx` NO se ha tocado: su `.mission-root` repite los mismos valores y se puede borrar cuando Cristóbal quiera.

## 2. Open questions for Javi
1. **Push**: la nota de Cristóbal (`manuelcgg165/night-log-2026-11-15.md`) dice que "la IA de Javi hará push a las 3:00". No lo he hecho: `CLAUDE.md` exige tu confirmación. Revisa la rama y haz push/PR a `dev` si te gusta.
2. **Requisitos de Marta en Normal**: están ocultos en Normal (solo Experto). Es su pieza principal de Explore v1; confirma con ella.
3. Todos los scores son 100, así que la lista "Pick a site" de Normal no ordena de forma útil hasta que haya scoring real.
4. Street View no está en la barra de Normal (sí el botón "Stand here in Street View" de la ficha).
5. No he añadido la sección "Design System" a `CLAUDE.md` (es de todo el equipo); la skill lo propone.
6. En Experto la cabecera salta a dos filas a 1280 px (7 pestañas + buscador + interruptor).
7. Fuente: solo monoespaciada del sistema; no se ha cargado una pixel-font (Cristóbal tampoco).

## 3. Cómo se verificó / límites
- `pnpm` no está instalado en este Mac: se usó `npx pnpm@9.15.9`.
- Skills de gstack: `/design-consultation` en modo no interactivo (solo DESIGN.md). **No se ejecutaron** `/plan-design-review` ni `/design-review` por separado; la revisión visual se hizo a mano con `/browse` en Normal y Experto. Recomendado pasarlas por la mañana.
