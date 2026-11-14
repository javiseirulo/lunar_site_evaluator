# 10 — Plan técnico: arquitectura, herramientas y reparto de trabajo

> **Plan vigente para construir la app** (adoptado por @javocruz el 2026-11-14; ver `docs/decisions/log.md`).
> Lo primero, la sección **0. Estado real**: qué hay ya en el repo y en qué se aparta el código del plan original.
> ⚠️ Los issues #34–#51 usan otro reparto (roles A–E, npm, `pipeline/`) y citan `docs/08-team-plan.md` / `09-architecture-contract.md`,
> que no están en el repo. Mientras el equipo no diga otra cosa, **manda este documento y el código de `dev`**.

## 0. Estado real (actualizado 2026-11-14)

### Ramas: se trabaja contra `dev`
- `dev` = rama de integración: **todo el trabajo entra aquí**. `main` = estable/entrega, solo recibe `dev` con un PR `dev` → `main` en cada integración.
- Flujo: issue → `git switch -c <handle>/<n>-<slug> origin/dev` → PR con `gh pr create --base dev` → revisión → squash-merge a `dev`.
  (Sustituye a las ramas `feat/<area>` del cronograma de abajo.)
- `Closes #n` solo cierra el issue cuando el cambio llega a `main`; antes, ciérralo a mano.
- Detalle: `docs/00-protocol.md`.

### Qué está hecho

| Pieza | Estado | Dónde |
|---|---|---|
| Monorepo pnpm (`web/`, `contracts/`) | ✅ v0 | raíz: `package.json`, `pnpm-workspace.yaml`, `.npmrc` |
| Contratos de datos v1 (tipos + JSON Schemas) | ✅ v0 | `contracts/` (ver §4 actualizado) |
| Datos **mock** (20 sitios, 30 días horarios, 5 capas) | ✅ v0 | `web/public/data/`, se regeneran con `pnpm mocks` |
| Store, carga de datos, router, shell, barra temporal (Javi2) | ✅ v0 | `web/src/core/` |
| Panel de capas, leyendas, mapa polar 2D (Javi2) | ✅ v0 | `web/src/layers/` |
| Landing, About (fuentes, declaración IA, sin branding NASA) | ✅ v0 | `web/src/pages/` |
| Tests (store, helpers, validación de `public/data`) + CI | ✅ | `web/src/core/*.test.ts`, `.github/workflows/web.yml` |
| Globo 3D + filtros (Marta) | ⏳ hueco listo | `web/src/globe/` (placeholder + lista/ficha de sitio de arranque) |
| Street View (Pablo) | v0 en rama local #46; terreno ion visible, giro completo pendiente de corregir/validar | `pabloizgui/46-lunar-streetview`, commit `a1c6216`; `dev` aún tiene placeholder |
| Mission / juego (Cristóbal) | ⏳ diseño descrito (#52), hueco listo | `web/src/game/` (placeholder) |
| Pipeline Python (Javi, Pablo) | Entrega polar real generada en rama #37; revisión/integración pendientes | `python/terrain/`, `web/public/data/terrain/`: heightmap 1025², máscara, elevación/pendiente y tabla de 20 sitios; horizonte/efemérides aún pendientes |
| Deploy público | ⏳ pendiente | `web/vercel.json` listo; proyecto Vercel con raíz `web/` |

### Cómo arrancar (cualquiera)
```bash
git switch -c <handle>/<n>-<slug> origin/dev
pnpm install      # pnpm descarga Node 22 solo para este repo (no hace falta cambiar tu Node global)
pnpm dev          # http://localhost:5173
pnpm test         # incluye la validación de web/public/data contra el contrato
```
Guía de la web (quién toca qué carpeta, cómo leer/escribir el store, helpers): **`web/README.md`**.
Contratos y mocks: **`contracts/README.md`**.

### Diferencias entre el código y el plan original (lo que cambió al implementarlo)
1. **Contratos ampliados** (detalle en §4): `sites.json` va envuelto (`version`, `mock`, `generated_utc`, `weights`, `sites[]`) y cada sitio añade `name` y `source`;
   `timeseries` añade `version`, `mock`, `site_id`, `step_s` y `earth_visible[]` opcional; `lit` es `0/1`; hay un **`manifest.json`** nuevo con la ventana temporal.
2. **Esquemas**: `sites.schema.json` (no `site.schema.json`), más `timeseries`, `layers` y `manifest`.
3. **Store**: además de los 4 campos del contrato tiene `layerOpacity` (opacidad por capa). Cambiar `mode` navega solo a la ruta correspondiente.
4. **Mapa polar 2D** en Explore (toggle 2D/3D): respaldo para móvil y mientras llega el globo. El 3D sigue siendo de Marta.
5. **Ventana de los mocks**: 30 días desde 2027-01-01 a paso horario (no un año), para que pesen poco (1,4 MB en total).
6. **Node 22 fijado por repo** con `.npmrc` (`use-node-version`).
7. **shadcn/ui**: preparado (`web/components.json`, helper `cn` en `src/lib/utils.ts`) pero sin componentes instalados todavía.
8. **Rutas**: `/`, `/explore`, `/streetview/:siteId`, `/game`, `/about`. En la UI, `game` se llama "Mission".

### Siguiente paso por persona
- **Javi**: sustituir los mocks por datos reales con la misma forma (`"mock": false`); `pnpm test` en `web/` comprueba el formato.
- **Pablo**: prototipo Cesium aislado en `web/src/streetview/StreetView.tsx`, con `useTimeseries` + `sampleAt` y límites explícitos; DEM/horizontes en `python/terrain/`. Acordar y exportar además el heightmap polar para Marta (ver §5 y §9).
- **Marta**: globo en `web/src/globe/GlobeView.tsx`; `loadLayerTexture(layer)` da un canvas coloreado para `THREE.CanvasTexture`; reemplazar o ampliar `SiteList.tsx`.
- **Cristóbal**: `web/src/game/`: motor de simulación de N días + veredicto explicado (ver §5, actualizado con su descripción del módulo Mission), leyendo `sites`, timeseries y `selectedSiteId`.
- **Javi2**: v1 = design system (shadcn), onboarding y deploy público.

---

## 1. Cómo encaja todo

La ciencia y el cálculo pesado se hacen **offline en Python** y la web consume
sus resultados estáticos. Street View puede usar **streaming visual de Cesium
Moon vía ion**: el despliegue sigue siendo estático, pero esa malla necesita
red. No se requiere una API de cálculo en tiempo real. Cada consumidor puede
desarrollar con mocks desde el primer día.

```
 [Python / backend offline]                  [Frontend web]
 Javi:  ephemerides + algoritmo ──┐
 Pablo: DEM/topografía ───────────┼──► /data (JSON, PNG/COG, tiles) ──► App (Vite + React + TS)
                                  │                                     ├─ Marta: visor 3D + exploración
                                  └──► (opcional) API FastAPI           ├─ Pablo: Lunar Street View
                                                                        ├─ Cristóbal: Mission (juego)
                                                                        └─ Javi2: shell, estética, layers
```

## 2. Stack común

| Capa | Herramienta | Versión orientativa | Instalado (lockfile) |
|---|---|---|---|
| Repo | Monorepo en GitHub, `pnpm` workspaces + carpeta `python/` | pnpm 9 | pnpm 9.15.9 |
| Python | Python 3.12, entornos con `uv` | — | — (sin empezar) |
| Frontend | Node 22 LTS, Vite 6, React 19, TypeScript 5 | — | Node 22.23.5, Vite 6.4, React 19.1, TS 5.9 |
| 3D | three.js + @react-three/fiber 9 + @react-three/drei 10 | three r17x | three 0.187, R3F 9.8, drei 10.7 |
| Estado global | zustand 5 (un solo store compartido) | — | zustand 5.1 |
| Estilos | Tailwind 4 + shadcn/ui | — | Tailwind 4.3 (shadcn preparado, sin componentes) |
| Animación / router | Framer Motion, React Router 7 | — | motion 14, react-router 7.18 |
| Deploy | GitHub Pages o Vercel (es estático) | — | `web/vercel.json` (Vercel) |
| Calidad | ESLint + Prettier, ruff (Python), GitHub Actions | — | ESLint 9, Prettier 3, vitest 3, CI `web.yml` |

Las versiones exactas se fijan en `pnpm-lock.yaml` y `uv.lock` el primer día, y no se actualizan durante el hackathon.

**Motores por módulo:** Marta mantiene three.js/R3F para el globo y Explore.
Pablo prioriza CesiumJS + Cesium Moon en Street View, sujeto a una prueba de
viabilidad. Se monta en un componente separado, con el mismo store/reloj.
Cesium aún no está en el lockfile: dependencia y configuración de build/asset
requieren PR coordinado con Javi2; no actualizar el stack común. Si el prototipo
falla, se usa la contingencia local three.js del bloque de Pablo.

## 3. Estructura del repo

```
lunar_site_evaluator/
├─ contracts/            ✅ tipos TS + JSON Schemas + generador de mocks
│  ├─ types.ts
│  ├─ sites.schema.json · timeseries.schema.json · layers.schema.json · manifest.schema.json
│  └─ scripts/gen-mocks.mjs
├─ python/               ⏳ por crear
│  ├─ ephem/             (Javi)
│  ├─ scoring/           (Javi)
│  ├─ terrain/           (Pablo)
│  └─ export/            → escribe en web/public/data
├─ web/
│  ├─ src/core/          ✅ store zustand, carga de datos, router, shell (Javi2)
│  ├─ src/layers/        ✅ panel de capas, leyendas, mapa polar 2D (Javi2)
│  ├─ src/pages/         ✅ páginas de cada ruta (Javi2)
│  ├─ src/globe/         ⏳ visor 3D + exploración (Marta)
│  ├─ src/streetview/    ⏳ (Pablo)
│  ├─ src/game/          ⏳ (Cristóbal)
│  └─ public/data/       ✅ mocks ahora, datos reales después
└─ data_raw/             (en .gitignore: kernels SPICE, DEM originales)
```

## 4. Contratos de datos (el pegamento para trabajar en paralelo)

> Fuente de verdad: **`contracts/types.ts`**. Los ejemplos de abajo reflejan el contrato v1 implementado.

**`manifest.json`** (nuevo): qué se generó y para qué ventana temporal.
```json
{ "version": 1, "mock": true, "generated_utc": "2026-11-14T00:00:00Z",
  "time_range": { "start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-30T23:00:00Z", "step_s": 3600 },
  "sources": ["..."] }
```

**`sites.json`**: lista de localizaciones candidatas. Sale de Javi y lo consumen todos.
```json
{ "version": 1, "mock": true, "generated_utc": "...",
  "weights": { "illum_pct": 0.4, "earth_vis_pct": 0.3, "slope_deg": 0.2, "max_dark_hours": 0.1, "psr_dist_km": 0 },
  "sites": [
    { "id": "shackleton_rim_01", "name": "Shackleton rim A", "lat": -89.9, "lon": 0.0, "elev_m": 1900,
      "valid": true, "score": 0.87,
      "metrics": { "illum_pct": 0.82, "earth_vis_pct": 0.55, "slope_deg": 6.2,
                   "max_dark_hours": 120, "psr_dist_km": 2.1 },
      "reasons": ["slope_ok", "illum_ok"], "source": "..." } ] }
```
`reasons` usa `<métrica>_ok` / `_low` / `_high` / `_long`; la UI los traduce a texto (`web/src/core/format.ts`).

**`timeseries/<id>.json`**: un paso por hora durante el periodo del manifest. Todos los arrays tienen la misma longitud.
```json
{ "version": 1, "mock": true, "site_id": "shackleton_rim_01", "step_s": 3600,
  "t_utc": [], "sun_az": [], "sun_el": [], "earth_az": [], "earth_el": [],
  "lit": [], "earth_visible": [] }
```
Azimut en grados desde el norte local en sentido horario [0, 360); elevación en grados; `lit` / `earth_visible` = 1 si el cuerpo supera el **horizonte de terreno**.
Lo consumen Street View (posición del Sol y la Tierra), la barra temporal (ventanas y cuenta atrás Sunset/Earthset) y la gamificación.

**Capas raster (Pablo/Javi → Marta/Javi2)**: PNG 8 bits gris + alfa (`gray8`; alfa 0 = sin dato), estereográfica polar sur hasta −80°.
- `layers/elevation.png`, `layers/slope.png`, `layers/illumination.png`, `layers/psr.png`, `layers/score.png`

`layers.json` describe proyección, `bounds_m`, tamaño en píxeles y, por capa, `value_range`, `units`, `palette` (paradas `[posición, color]`), `kind` (`continuous` / `categorical`), visibilidad y opacidad por defecto, descripción y fuente.
Proyección: ρ = 2R·tan((90° + lat)/2), x = ρ·sin(lon), y = ρ·cos(lon), R = 1 737 400 m; la fila 0 del PNG es y máxima.

**Eventos del store (frontend)**:
- `selectedSiteId`
- `currentTimeUTC` (ISO UTC; lo mueve la barra temporal compartida)
- `activeLayers[]` (orden de dibujo, de abajo arriba)
- `mode: "explore" | "streetview" | "game"`

Estos cuatro campos son la única interfaz entre los módulos web (más `layerOpacity`, solo para pintar capas).

**Regla:** si alguien cambia un contrato, se hace con un PR a `contracts/` y se avisa a todos.

## 5. Por persona

### Javi: ephemerides y algoritmo de validez
- **Herramientas:** `spiceypy` (SPICE de NAIF) con kernels `de440.bsp`, `moon_pa_de440_200625.bpc`, `moon_de440_250416.tf`, `naif0012.tls` y `pck00011.tpc`. Además `numpy` 2, `scipy`, `pandas`/`polars` y `numba` para el cálculo de horizontes. Con `skyfield` se pueden hacer comprobaciones rápidas.
- **Qué calcula:** el vector al Sol y a la Tierra en el frame `MOON_ME` para cada punto, y la elevación respecto al **horizonte local**, que necesita el DEM de Pablo. Con eso se obtiene el % de iluminación, la visibilidad de la Tierra (para comunicaciones) y la noche más larga.
- **Algoritmo:** primero filtros duros (pendiente < X°, rugosidad, iluminación mínima). Después un score ponderado y normalizado con pesos configurables en `scoring/config.yaml`, para que el frontend pueda mostrarlos como sliders.
- **Iteraciones:**
  - v0: mock de `sites.json` con 20 puntos inventados, entregado el día 1. ✅ (lo genera `pnpm mocks`)
  - v1: Sol y Tierra sin horizonte (solo esfera).
  - v2: horizonte real a partir del DEM, calculado una vez por punto y en 360 azimuts.
  - v3: score con pesos y explicación de cada decisión (`reasons`).
- **Dependencia con Pablo:** el DEM y la máscara de horizonte. Acordad pronto un formato tipo `horizon/<id>.npy` con 360 elevaciones.

### Pablo: topografía y Lunar Street View

**Objetivo y alcance.** Construir una vista sintética desde la superficie lunar,
orientable 360°, con topografía, coordenadas, altura del observador y azimut/elevación
del Sol y la Tierra. La arquitectura debe admitir cualquier ubicación; el primer
recorrido validado usa sitios del equipo. La cobertura visual global no implica
disponer de efemérides, horizonte científico o resolución de 5 m para cada punto.
El módulo aporta a Explore y al posterior modo educativo sin convertirse en una
segunda aplicación ni modificar las responsabilidades de los compañeros.

**Arquitectura visual recomendada.** CesiumJS + Cesium Moon (3D Tiles, asset de
referencia `2684829`) dentro de `web/src/streetview/`. Se reutilizan geometría global,
curvatura y niveles de detalle; no se construye un motor global de terreno desde
`PlaneGeometry`. El asset publica terreno ~5 m entre 87,5°S y 90°S, con distinta
resolución fuera del polo. Configurar elipsoide lunar y desactivar globo, atmósfera,
geocodificación y cuerpos celestes configurados por defecto para la Tierra.
La cuenta ion ya existe según Pablo; el acceso efectivo al asset y su rendimiento
se comprueban en el primer prototipo. Community es la opción inicial recomendada
para evaluación no comercial, dentro de sus condiciones y cuotas; sin contratar
un plan de pago como requisito de arranque.

**Compatibilidad con el equipo.** Conservar React, TypeScript, rutas y store de
Javi2. El shell de Javi2 (PR #53, ya integrado en `main` y `dev`) reserva `StreetView.tsx` y ya proporciona `useSelectedSite`,
`useTimeseries`, `sampleAt` y el `TimeBar`. El componente Cesium se monta por separado
del canvas R3F de Marta, se carga al entrar y libera visor, recursos y listeners
al salir. Esto mantiene el globo/Explore de Marta y la gamificación de Cristóbal.
Añadir la dependencia/configuración de Cesium mediante PR coordinado; no migrar
el stack de otros módulos ni crear otro store o reloj.

**Datos científicos independientes.** Pablo mantiene el pipeline offline en
`python/terrain/`: adquirir DEM, revisar marcos/unidades, recortar, generar altitud,
pendiente y perfiles de horizonte. Base inicial: LOLA PGDA producto 81,
`ldem_87s_5mpp.tif`, 87–90°S a 5 m/píxel, en MOON_ME de DE421 según el productor.
Ampliar con un producto polar/global de menor resolución únicamente donde el
alcance científico lo requiera. Los datos crudos siguen fuera de Git y del bundle.
Validar la referencia vertical y su transformación al marco de Javi; el nombre
genérico `MOON_ME` o un CRS lunar no garantizan por sí solos la misma realización.

**Entregable adicional para Marta (prioritario).** Exportar un heightmap polar
sobre la misma proyección, radio, `bounds_m`, orientación y ventana hasta −80°
de `layers.json` (§5 Marta). Objetivo inicial: rejilla 1025×1025 en Float32
little-endian con máscara y manifest; Int16 es una opción solo si rango,
NoData y cuantización quedan acordados. Registrar altura, referencia vertical,
CRS/marco, dimensiones, orden de filas, escala y cobertura. El DEM PGDA 81 de
87–90°S y el recorte local de 1,28 km no cubren todo el parche. **Actualización
#37:** verificado y descargado `LDEM_80S_80MPP_ADJ.TIF` de PGDA 90, junto con
el LDSM de 80 m. Generada entrega real en `web/public/data/terrain/`: 1025²
Float32 LE, máscara y manifest, más dos capas 512² y tabla de terreno por sitio.
El paso de malla es 593,76171875 m (1024 intervalos con extremos incluidos),
distinto del espaciado de 80 m del producto original. Las esquinas fuera del
casquete y los datos ausentes siguen como NoData, sin inventar alturas.
Ver [entrega e instrucciones](team/pabloizgui/terrain-handoff.md) y
[pendientes](team/pabloizgui/tasks.md). El esquema propuesto y el loader se acuerdan con Marta/Javi2 mediante
PR a `contracts/`; no reinterpretar `elevation.png` gray8 como altura precisa.

**Entregables de terreno y horizonte.** Reutilizar el exportador existente de
GeoTIFF, heightmap PNG16, máscara y Float32 little-endian con manifest. El PNG16
es un formato de intercambio; para alturas en web se necesita un decodificador
adecuado o Float32, no una lectura de Canvas que reduzca los datos a 8 bits.
Preparar para Javi perfiles con azimut desde norte lunar local, sentido horario,
elevación en grados, altura del observador, fuente/marco/resolución y cobertura.
360 azimuts son una resolución inicial declarada, no una precisión garantizada.
Curvatura y relieve lejano forman parte del horizonte; un recorte de 20×20 km no
garantiza cobertura suficiente. Distinguir norte de cuadrícula polar de norte
local. Exportar incertidumbres o azimuts sin cobertura como desconocidos.
Los perfiles offline pueden intercambiarse en NPY; su representación web y las
capas de altitud/pendiente deben añadirse al contrato común mediante PR.
Iluminación, visibilidad temporal y score siguen siendo responsabilidad de Javi;
los productos PSR son una ampliación con fuente validada, no un entregable inicial.

**Observador y tiempo.** Cámara a 1,7 m sobre la malla visible como valor inicial
configurable; altura científica del DEM y altura visual se conservan por separado.
Control de orientación con ratón y táctil, sin exigir sensores del móvil. Consumir
`selectedSiteId`, `currentTimeUTC`, `mode` y el control temporal existente. Para los
sitios del catálogo, conservar `sites.json` y `timeseries/<id>.json`; el muestreo
real lo indican los datos, sin imponer un año de series horarias. Mostrar la hora
de la muestra usada y el rango disponible: `sampleAt` actualmente toma la muestra
anterior y limita los extremos, por lo que no debe presentarse como extrapolación
válida fuera del rango. Mantener visibles las etiquetas `mock` cuando proceda.

**Coordenadas personalizadas y crecimiento global.** La selección manual puede
mover la cámara visualmente. Si cambia el observador respecto al sitio seleccionado,
no reutilizar sus series como si correspondieran al nuevo lugar. La primera entrega
señala qué resultados no están disponibles. Para ciencia en ubicaciones arbitrarias,
acordar con Javi una representación de vectores/posiciones en marco lunar y
tiempo explícitos, más una transformación topocéntrica validada. No se exige
un archivo nuevo al MVP: primero evaluar los datos existentes y la precisión
necesaria; para la Tierra no asumir paralaje nulo en resultados científicos; esto permite
reutilizar datos temporales sin precalcular una serie por cada punto de la Luna.
Requiere contrato y validación propios, igual que el horizonte fuera de los sitios
precalculados. La extensión compartida de ubicación se acuerda con Javi2; las
coordenadas locales del visor no sobrescriben silenciosamente `selectedSiteId`.

**Cielo y validez visual.** Posicionar Sol/Tierra desde los resultados de Javi,
mostrar azimut/elevación y distinguir horizonte geométrico de ocultación por relieve.
Añadir estrellas y constelaciones después del recorrido de terreno + Sol/Tierra,
con catálogo y transformación inercial→lunar documentados. La fase de la Tierra
requiere geometría e información adicionales a azimut/elevación; no se presupone
resuelta por los arrays existentes. Las sombras de imágenes compuestas de Cesium
Moon no representan necesariamente la fecha del usuario; sombreado dinámico y
perfil numérico se distinguen explícitamente. No aplicar un offset vertical fijo
Cesium/LOLA a partir de un reporte ajeno: comparar varios puntos, marcos y niveles
de detalle y documentar las diferencias antes de calibrar.

**Orden de implementación.**

1. Conservar descarga/exportador y hacer un prototipo Cesium aislado: acceso al
   asset, elipsoide correcto, cámara sobre la malla, giro 360°, controles táctiles
   y carga/limpieza dentro del shell. Fijar aceptación con una escena real antes
   de ampliar: un sitio del equipo en escritorio y móvil, sin enterramiento de
   cámara ni uso de configuraciones terrestres.
2. Integrar catálogo, selección y tiempo del shell; mostrar Sol/Tierra de las
   series con sus límites. Reutilizar los mocks existentes solo como mocks.
3. En paralelo al visor, acordar/exportar el heightmap polar que desbloquea a
   Marta y completar/validar el DEM propio. Entregar recortes, altitud/pendiente
   y perfiles de horizonte de los sitios prioritarios a Javi; son productos
   diferentes, con cobertura/resolución declaradas.
4. Contrastar dos sitios y fechas entre renderer, DEM y cálculo de Javi; probar
   cambio de modo, red interrumpida, ausencia de datos y latencias de carga. La
   precisión de las métricas se fija con la resolución y los casos de referencia,
   no con los decimales mostrados.
5. Ampliar coordenadas arbitrarias con datos compatibles; después estrellas y
   constelaciones. QR de instantánea es una ampliación educativa posterior al
   recorrido integrado; sincronización de clase en directo queda fuera del MVP.

**Contingencia acotada.** Si el primer prototipo demuestra que acceso, rendimiento
o georreferenciación hacen inviable Cesium para la entrega, usar los recortes reales
ya exportados en three.js/R3F dentro del mismo componente y limitar explícitamente
la cobertura. No desarrollar ambos renderers en paralelo. Esa alternativa debe
incluir curvatura/horizonte y procedencia, no presentar un plano local como cobertura
global. La elección no cambia los contratos de selección, tiempo o series.

**Estado real y límites.** Existen descargador, inspección y exportador offline;
un primer recorte real de 1,28×1,28 km y doce pruebas correctas de esas herramientas.
El recorte se eligió por disponibilidad de teselas recibidas, no es un sitio de
misión validado. La descarga completa sigue pendiente. La escena Cesium, los
perfiles de horizonte, las capas para el frontend, la integración web y el cielo
estelar todavía no están implementados. El trabajo hecho sirve a la base científica
y a la contingencia local; no obliga a construir la geometría visual global propia.

**Fuentes del bloque:** [Cesium Moon](https://cesium.com/platform/cesium-ion/content/cesium-moon/),
[PGDA 81](https://pgda.gsfc.nasa.gov/products/81), contratos y helpers en `dev`.
Reconciliación solicitada por Pablo; seguimiento en **#59**.

### Marta: visor 3D de la Luna y modo exploración
> Revisado 2026-11-14 contra el código de `dev` (`contracts/types.ts`, `web/src/core`, `web/src/layers`, mocks de `public/data`).
> Marta trabaja en `web/src/globe/`; todo lo que sea de otra carpeta o de `contracts/` va por PR con su dueño.

- **Herramientas:**
  - R3F + drei (ya instalados: three 0.187, R3F 9.8, drei 10.7). `OrbitControls`; `Html` **solo** para la etiqueta del pin seleccionado o bajo el ratón.
  - Estado: el compartido es el store de `@/core` (Javi2), con sus 4 campos de contrato (`selectedSiteId`, `currentTimeUTC`, `activeLayers`, `mode`) + `layerOpacity`.
    No se crea otro store global. Los pesos y el rango de fechas son estado **local** de `src/globe` (un `create()` de zustand propio o `useState`);
    si otro módulo los necesita (p. ej. el juego), PR a `src/core` con Javi2.
  - Globo: textura de color LROC WAC global y normal map derivado de LOLA, en JPG/WebP (sin KTX2). **4k por defecto**; 8k solo si el rendimiento lo aguanta (riesgo §8).
    ⚠️ Fuente y versión exactas de cada textura → `docs/04-resources-data.md` antes de subirlas (aún no están registradas).
  - Terreno polar real a partir de un DEM LOLA del polo sur. Candidato: `LDEM_80S_80MPP_ADJ` (80 m/px).
    ⚠️ **Confirmar autoría, producto y versión al descargarlo** y registrarlo en `04-resources`; lo que hay registrado de Barker et al. 2021 es otro producto (PGDA 78: DEM de 5 m por sitio).
    El recorte y la exportación los hace **Pablo** (dueño del DEM en `python/terrain/`); Marta consume el archivo exportado.

- **Funciones:**
  - **Globo lunar con pins** de `sites.json` (`useData((s) => s.sites)`), coloreados con `scoreColor` de `@/layers` (mismos colores que el mapa 2D y la lista).
    Con ~20 sitios basta un `<mesh>` por pin; `instancedMesh` si se pasa de ~200. Los sitios con `valid: false` se pintan atenuados.
    Todos los candidatos actuales están entre 81,5°S y 89,9°S, así que en vista de globo se agrupan en un marcador **"South Pole · N sites"** que lanza el zoom al parche polar.
  - **Parche polar 3D** con terreno real:
    - **Ventana = la de `layers.json`** (estereográfica polar sur hasta −80°, ±304 km), no 85°S–90°S: con 85°S quedarían fuera 6 de los 20 sitios
      (Nobile A, Amundsen, Cabeus B, de Gerlache–Kocher, Mons Mouton, Plain at 81°S). Así las capas se pegan sin recortar PNGs.
    - Malla construida con las alturas (no `displacementMap`): cada vértice se coloca **sobre la esfera real** (`(R + h)` en la dirección radial de su lat/lon).
      La curvatura sale sola y es grande: ~27 km de caída en el borde del parche.
    - Exageración vertical ×2 indicada en pantalla.
    - Posición de cada sitio con `projectSouthPolar` / `latLonToUv` de `@/core`. **No hace falta añadir `px`/`py` a `sites.json`.**
    - **Iluminación según la fecha** (`currentTimeUTC` de la barra temporal): la dirección del Sol en el sistema fijo a la Luna es la misma en todo el parche
      (paralaje despreciable). Se obtiene de la timeseries de cualquier sitio: (`sun_az`, `sun_el`) en su lat/lon → vector en los ejes del parche → `DirectionalLight`.
      **No hace falta un archivo nuevo de "vector Sol"**; lo mismo vale para la Tierra.
    - Las sombras del shadow map son **ilustrativas**: se calculan sin la exageración ×2 (con ella serían más largas de lo real) y con ~0,6–1,2 km por celda.
      La cifra oficial de luz es `lit` / `illum_pct` del pipeline de Javi, no el render. Rótulo: "Illustrative shading".
    - Textura del parche: albedo neutro o mosaico polar LROC, con la luz en tiempo real. **Nada de hillshade precalculado**: sumaría una segunda luz fija que contradice la fecha.
  - **Barra lateral de filtros** (sustituye o amplía el `SiteList` de arranque):
    - Sliders de pesos con los valores por defecto de `sites.json.weights`.
    - Score en cliente: `score = Σ wᵢ·nᵢ / Σ wᵢ`, con `nᵢ` la métrica normalizada a 0–1 **en la dirección "más es mejor"**
      (pendiente, noche más larga y distancia a PSR se invierten o acotan). El mock usa `1 − slope/20` y `1 − dark_h/500`.
      ⚠️ La normalización real la define **Javi**; hay que acordarla y escribirla en el contrato (PR a `contracts/`), para que `score.ts` reproduzca `site.score` con los pesos por defecto.
      Un test lo comprueba.
    - Los filtros duros (`valid`) no cambian con los pesos: un sitio no válido nunca sube al top.
    - **Rango de fechas**: `illum_pct`, `earth_vis_pct` y `max_dark_hours` se recalculan para ese rango a partir de las timeseries
      (`lit`, `earth_visible`; `fractionOn` en `@/core`; 20 archivos, ~1,4 MB en mock). `slope_deg` y `psr_dist_km` no dependen de la fecha.
      El rango es local y distinto de `currentTimeUTC`: la barra temporal es el instante y el rango es el filtro.
    - Una sola función `score.ts` en `src/globe/` (el repo es TypeScript), compartida por pins, lista y mapa de calor.
  - **Clic en un pin** → `selectSite(id)` → `SiteDetail` (ya existe en el arranque) → "Stand here in Street View" = `setMode('streetview')`, que navega a `/streetview/:siteId`.
    La transición animada (vuelo de cámara hasta el sitio) va **antes** de `setMode`; la vista de Street View es de Pablo.
  - **Capas:**
    - Las capas raster (pendiente, sombra permanente, iluminación, score, elevación) **ya vienen en `layers.json`**. Las produce el pipeline (Pablo/Javi); hoy son mock.
      Marta no descarga productos LDSM/LPSR por su cuenta.
    - La UI para activarlas, ordenarlas y cambiar su opacidad es `LayersPanel` (Javi2). Marta solo las **pinta** en el parche:
      lee `activeLayers` (orden de abajo arriba) y `layerOpacity` del store, y usa `loadLayerTexture(layer)` → `THREE.CanvasTexture` mapeada con `latLonToUv`.
    - **Misiones pasadas** (globo): marcadores de alunizajes históricos desde `historic_sites.json`.
      Clic → tarjeta con nombre, agencia/país, fecha, coordenadas, resultado y una línea de contexto, más la fuente de las coordenadas.
      Solo texto, sin logotipos, parches ni banderas (CLAUDE.md §3). Interruptor local en `src/globe`, porque no es una capa raster.
      Cubre la "lista curada (Apollo, CLPS, otros países)" que pide el reto (`07-mvp-plan.md`).
    - **Mapa de calor de idoneidad** (parche, experimental): celdas de 5 km coloreadas en 3 clases (excelente / regular / no cumple), recalculadas en cliente con los sliders y la misma `score.ts`.
      Se suavizan, se eliminan las regiones pequeñas y solo las grandes llevan etiqueta, con el nombre del accidente más cercano.
      Leyenda "Indicative, 5 km cells".

- **Depende de:**
  - **Ya disponible en `dev`:** `sites.json`, `timeseries/<id>.json`, `layers.json` + PNG (todo mock), el store, `TimeBar`, `LayersPanel`, `SiteDetail`,
    y los helpers `loadLayerTexture`, `projectSouthPolar`, `latLonToUv`, `sampleAt`, `fractionOn` y `scoreColor`.
  - **Nuevo, requiere PR a `contracts/` y avisar al equipo** (regla §7.3). Hasta que llegue lo real, Marta añade un mock en `gen-mocks.mjs` y trabaja con él:
    1. **Heightmap del parche** (dueño: Pablo). Rejilla cuadrada sobre `bounds_m` de `layers.json`, p. ej. 1025×1025 en `Int16` de metros
       (~2 MB; ~0,6 km/celda) o `Float32`, con su cabecera (`bounds_m`, tamaño, unidades) en `layers.json` o en un JSON propio.
       No sirve un PNG de 16 bits: el canvas del navegador lo decodifica a 8 bits. Tampoco la capa `elevation.png` actual: con 8 bits son escalones de ~33 m.
    2. **Normalización del score** en `sites.json` (dueño: Javi): rango y sentido de cada métrica.
    3. **`historic_sites.json`** (dueña: Marta; puede reutilizarlo Cristóbal en Mission): tipo `HistoricSite` en `contracts/types.ts`
       (`id`, `name`, `agency`, `country`, `date_utc`, `lat`, `lon`, `outcome`, `note`, `source`) y archivo en `public/data/`.
       Cada coordenada con fuente en `04-resources`.
    4. **`grid_metrics.bin`** (solo para el mapa de calor; dueños: Javi y Pablo): métricas por celda de 5 km y día sobre la misma ventana.
       ~120×120 celdas × 30 días × 3 métricas en `uint8` ≈ 1,3 MB. Necesita el cálculo de horizontes por celda: es lo más caro del pipeline.
       Si no llega, el mapa de calor se descarta sin bloquear nada.

- **Iteraciones:**
  - v0: esfera texturizada en `GlobeView.tsx` con pins de `sites.json` (mock), marcador del polo y clic → `selectSite`. Detalle con el `SiteDetail` existente.
  - v1: barra lateral con sliders de pesos y rango de fechas, `score.ts` con test (reproduce `site.score`) y lista reordenada en vivo. Con esto, Explore queda completo.
  - v2: parche polar con heightmap (mock primero, luego el de Pablo), curvatura real, luz según `currentTimeUTC`, capas de `layers.json` pintadas encima y transición animada al Street View.
  - v3: capa de misiones pasadas con `historic_sites.json`.
  - v4 (experimental): mapa de calor de idoneidad. Se decide con el primer render: si sale fragmentado tras el suavizado, o si `grid_metrics.bin` no llega, se descarta.
  - En móvil se queda el mapa polar 2D de Javi2 (toggle 2D/3D en `ExplorePage`). El 3D no tiene que funcionar en 375 px.

### Javi2: web, estética y layers de la página
- **Responsable de** `src/core` (store, loader de datos, router) y del shell: layout, navegación entre modos, landing, about/datos/créditos NASA y responsive.
- **Herramientas:** Tailwind 4, shadcn/ui, Framer Motion y React Router 7. La identidad visual se puede definir con Figma o Stitch.
- **Layers:** gestiona el sistema de capas (registro, orden, opacidad, leyendas) con `layers.json`. Marta las pinta en 3D y Javi2 da la UI de control.
- **Iteraciones:**
  - v0: esqueleto con 3 rutas vacías y el store, entregado el día 1 porque desbloquea a todos. ✅ (PR #53, más capas, mapa 2D, landing y About)
  - v1: design system (colores, tipografía, componentes).
  - v2: leyendas y onboarding.
  - v3: pulido, rendimiento (lazy-load de modos ✅ ya hecho) y deploy.

### Cristóbal: módulo Mission (juego)
> Actualizado el 2026-11-14 según la descripción de @Manuelcgg165 (issue #52, `docs/team/manuelcgg165/game-module.md` en la rama
> `Manuelcgg165/52-mission-module-notes`). **Sustituye** a las mecánicas del plan original (logros, quiz, ranking, misiones tipo "encuentra un punto con >80% de luz").

- **Qué es** (mantiene la idea del equipo, `docs/ideas/javiseirulo-explore-mission.md`):
  - Alerta tipo Mission Control: "no podemos aterrizar donde estaba previsto".
  - Pocos requisitos y 4–5 sitios con sus parámetros, **sin indicar cuál es mejor**.
  - El jugador elige uno, se simulan N días y un **veredicto explica por qué** salió bien o mal ("sin visibilidad de la Tierra", "te quedaste sin Sol"). Opción de reintentar.
  - Dos variantes: **modo profesional** y **modo estudiante** (jugador único o una clase). Sin multijugador.
- **Cómo se construye:**
  - Carpeta `web/src/game/`, TypeScript sobre el store compartido, tests con vitest.
  - Consume `sites.json` (métricas), `timeseries/<id>.json` (`t_utc`, `sun_el`, `earth_el`, `lit`; también `earth_visible` si viene) y del store `selectedSiteId`, `currentTimeUTC` y `mode: "game"`.
  - Helpers ya disponibles en `@/core`: `useTimeseries`, `sampleAt`, `hoursUntilChange`, `fractionOn`.
  - **Veredicto determinista**, calculado de la serie temporal (sin IA dentro del producto).
  - No depende del 3D ni del cálculo real: se desarrolla con los mocks (la ventana mock de 30 días cubre simulaciones de 9 o 14 días).
- **Necesita de los demás:** contratos de `sites.json` y `timeseries` estables (aviso si cambian) y series horarias que cubran toda la ventana simulada de los sitios del escenario.
- **Iteraciones:**
  - v0: motor de simulación y veredicto con datos mock y tests.
  - v1: interfaz (alerta, tarjetas de sitios, simulación, veredicto, reintentar).
  - v2: datos reales e integración con el globo y la ficha de sitio.
  - v3: modo estudiante y pulido.
- **Pendiente de cerrar:** reglas de victoria y derrota · duración de la simulación (9 o 14 días) · qué diferencia el modo profesional del modo estudiante.

## 6. Cronograma (hackathon de ~48 h; escalar si tenéis más tiempo)

| Fase | Objetivo | Entregables clave |
|---|---|---|
| **H0–H3** | Contratos y esqueleto | ✅ `contracts/`, repo, mocks en `public/data`, store y rutas (Javi2) |
| **H3–H16** | v0/v1 en paralelo con mocks | Cada uno en su carpeta y su rama `<handle>/<n>-<slug>` desde `dev` |
| **H16** | **Integración 1** | Datos reales v1 de Javi y Pablo sustituyen a los mocks; PR `dev` → `main` |
| **H16–H34** | v2 | Horizonte real, sliders de score, cielo animado, misiones conectadas |
| **H34** | **Integración 2 + freeze de features** | PR `dev` → `main` |
| **H34–H44** | v3 y pulido | Rendimiento, estética, textos, demo |
| **H44–H48** | Deploy, presentación, README | Se despliega `main` |

## 7. Reglas para no pisarse
1. **Mocks primero:** nadie espera a nadie. Cada consumidor trabaja con el mock del contrato.
2. **Una carpeta por persona.** Solo se tocan archivos ajenos con un PR revisado por su dueño.
3. **Cambios de contrato:** PR a `contracts/` y aviso en el canal del equipo.
4. **Pipeline de datos reproducible:** un comando `uv run python -m export.all` regenera todo `public/data`. Los datos crudos no van al repo.
5. **Sync de 10 minutos** en cada hito de integración.
6. **Todo entra por `dev`** (PR `--base dev`); `main` solo recibe `dev`.

## 8. Riesgos a tener en cuenta
- **DEM polares grandes:** recortar solo la zona de interés (por ejemplo el polo sur por debajo de −80°).
- **Horizontes de cálculo lento:** precalcularlos con `numba` y para menos puntos (200–1000 candidatos).
- **Texturas pesadas en web:** usar KTX2/WebP y no pasar de 8k.
- **Precisión vs. tiempo:** v1 sin horizonte ya da una demo funcional, y v2 la mejora.
- **Mocks ≠ resultados:** los datos actuales son inventados (badge "Mock data" en la UI). No usarlos en capturas de la entrega.

## 9. Coordinación de Pablo con los módulos actuales (#59)

Actualización de Pablo, 2026-11-14, contrastada con `dev` en `3cc91ef` y con
el plan revisado del chat «Proponer enfoques educativos lunares». Se conserva el
texto completo de los bloques de Marta, Javi, Javi2 y Cristóbal de esa revisión.
Lo propuesto aquí se publica para revisión compartida; no atribuye un OK a los demás.

| Con quién | Interfaz que se mantiene | Lo que hay que acordar antes de implementar |
| --- | --- | --- |
| Javi | `sites.json`, `timeseries/<id>.json`, azimut/elevación y visibilidad del pipeline | Perfil de horizonte (marco, altura, resolución y cobertura) y ampliación futura para coordenadas arbitrarias |
| Marta | Globo R3F, helpers de proyección, `layers.json`, `activeLayers`, `layerOpacity` | Heightmap polar Float32 + máscara/manifest sobre la ventana completa; el DEM de 87–90°S no basta para llegar a −80° |
| Javi2 | Componente React Street View, rutas, selección, reloj y loaders de `@/core` | Dependencia/build Cesium, carga diferida y limpieza; altura del observador y coordenadas propias solo con extensión de contrato revisada |
| Cristóbal | `mode: "game"`, selección y series del mismo pipeline; veredicto determinista | No introducir dependencia del renderer Cesium para jugar; respetar cobertura temporal y valores desconocidos |

Los PNG gray8 de las capas actuales son para visualización. El heightmap de Marta
y los perfiles de horizonte son productos nuevos, pendientes de PR de contrato;
este cambio documental no los crea ni cambia los esquemas v1. `sampleAt` toma la
muestra anterior y limita extremos: mostrar el instante usado y detectar el
fuera de rango. Un punto de cámara nuevo no recibe la serie de otro lugar.

No se publica código ni datos crudos de Pablo con #59. El descargador/exportador
y las notas locales se conservan para sus propios PRs. Las pruebas de adquisición
no acreditan una escena Cesium, una predicción de horizonte ni un enlace de radio.

### Entrega posterior de terreno (#37, 2026-11-14)

El candidato polar de Marta ya está verificado en la fuente oficial PGDA 90.
La rama `pabloizgui/37-terrain-handoff` añade datos reales separados del catálogo
mock, propuesta `PolarHeightmap`, pruebas Python/consumidor JS y guía de lectura.
Se mantienen pendientes la revisión del contrato/loader por Marta/Javi2 y los
horizontes de Javi (#38). El muestreo entrega terreno real en coordenadas de
fixtures; no convierte scores, iluminación ni sitios inventados en resultados.
