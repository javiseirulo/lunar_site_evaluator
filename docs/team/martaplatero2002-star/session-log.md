# Notas de sesión — martaplatero2002-star (Marta: visor 3D + Explore)

## 2026-11-14 — Sesión 1: plan del visor 3D
- gstack clonado en `~/.claude/skills/gstack` (`check-gstack.sh` → OK). Falta ejecutar `./setup`, que necesita Bun (no instalado en esta máquina).
- Reescrita mi sección de `docs/10-plan-tecnico.md`, contrastada con el código de `dev`. Cambios principales respecto a mi borrador:
  - El parche polar cubre la misma ventana que `layers.json` (hasta −80°, ±304 km), no 85°S: si no, se quedan fuera 6 de los 20 sitios.
  - Sin `px`/`py` en `sites.json` (ya están `projectSouthPolar` / `latLonToUv`) ni archivo de "vector Sol": la dirección del Sol en el sistema lunar es la misma en todo el parche y sale de cualquier timeseries.
  - Las sombras son ilustrativas y sin la exageración ×2; nada de hillshade precalculado.
  - Las capas de pendiente y PSR ya vienen en `layers.json` (las produce el pipeline); la UI de capas es `LayersPanel` (Javi2) y yo solo las pinto.
  - Estado compartido = store de `@/core`; pesos y rango de fechas son locales de `src/globe`.
  - Contratos nuevos (PR a `contracts/`): heightmap del parche (Pablo), normalización del score (Javi), `historic_sites.json` (yo), `grid_metrics.bin` (opcional).
  - Pendiente de verificar: autoría y versión de `LDEM_80S_80MPP_ADJ` y de las texturas LROC/LOLA → `04-resources-data.md`.

## 2026-11-14 — Sesión 2: globo 3D v0 (rama `martaplatero2002-star/61-globo-v0`)
- `GlobeView.tsx` carga en diferido `GlobeCanvas.tsx` (R3F): three.js solo se descarga al pulsar 3D, no al abrir Explore en 2D.
- Escena: esfera r=1 (128×64) con `lroc_color_poles_4k.jpg` (SVS CGI Moon Kit, registrada en `04-resources`), `Stars`, luz ambiente + direccional fija (la luz por fecha llega en v2), `OrbitControls` sin pan, distancia 1.01–5, con damping y velocidad de giro que baja al acercarse.
- `geo.ts`: `latLonToVec3` (y arriba, lon 0 → +X, lon 90 → −Z; coincide con las UV de `SphereGeometry`), con test.
- Pins: un mesh por sitio, color `scoreColor`, opacidad 0,35 si `valid: false`; tamaño proporcional a la distancia cámara–superficie; el seleccionado ×1,6 con anillo. Clic → `selectSite`. Etiqueta (nombre · score) solo para el pin bajo el ratón y el seleccionado, oculta si queda detrás del globo.
- Marcador "South Pole · N sites" visible con la cámara a distancia > 2; al pulsarlo la cámara vuela (lerp) a lat −89°, distancia 1,3, manteniendo el azimut.
- Hallazgo: desmontar un `<Html>` de drei con React 19 lanza "removeChild … not a child of this node" y rompe el árbol. Solución: todos los `<Html>` se quedan montados y se ocultan por estilo; el aviso de carga es un div fuera del Canvas.
- Verificado: lint, typecheck, 17 tests y build. En navegador (antes del arreglo de `<Html>`): textura, vuelo al polo, pins separados al acercar y hover con etiqueta. Pendiente: repetir la prueba tras el arreglo (clic en pin → ficha).
- Controles, a petición de Marta: botón izquierdo = mover, derecho = girar, rueda = zoom; velocidad a la mitad (`MOUSE_SPEED = 0.5`).
- Probado `TrackballControls` para poder girar por encima de los polos (OrbitControls se bloquea ahí): a Marta no le gustó y se volvió a `OrbitControls`. El bloqueo en los polos se queda por ahora.
- Interacción con clic (un clic sin arrastrar; si el puntero se mueve más de 4 px cuenta como arrastre):
  - En un pin de sitio: lo selecciona (`selectSite`) y abre una ficha junto al pin (nombre, score, coordenadas, aviso si no pasa los filtros). Volver a pulsarlo o la ✕ lo deselecciona.
  - En el suelo: ficha "Point on the Moon" con las coordenadas, botón Copy (al portapapeles como `lat, lon` decimal) y "Create pin here".
  - Formulario "Pin by coordinates" (arriba a la izquierda del globo): nombre opcional, lat y lon (admite `-89.5`, `89.5 S`, `45,2`, `45.2 E`); al añadir, la cámara vuela al pin.
  - Pins propios (rombo azul claro): ficha con coordenadas, Copy y "Delete pin". Se guardan en localStorage (`customPins.ts`).
- Decisión (según docs/10 §"Coordenadas personalizadas"): los pins propios son locales del globo, **no** cambian `selectedSiteId` y avisan de que no hay datos de luz/Tierra para ese punto. Compartirlos con el mapa 2D, Compare o Mission requiere ampliar el store con Javi2; calcular su ciencia requiere a Javi (coordenadas arbitrarias).

## 2026-11-14 — Sesión 2 (cont.): requisitos, filtrado y orden en vivo
- Rama actualizada con `dev` (#63 night plate, #64 plan de Javi, #66 selector Design/Mission). Conflictos solo en `04-resources` y `si-usage-log` (append-only): se conservaron todas las líneas.
- Explore: los sitios candidatos **no aparecen** (ni en la lista ni como pins del globo) hasta pulsar **Show matching sites**. Después, cada slider re-filtra y re-ordena en vivo.
  - Formulario de requisitos en `SiteList`: Sunlight ≥, Earth view ≥, Slope ≤, Longest dark ≤. Lee y escribe `missionConfig.requirements` del store (J9 de Javi). Botones Reset (valores por defecto de Javi) y Hide sites.
  - Lista: los que cumplen, ordenados por score; debajo, plegados, los que no, con el primer requisito que fallan ("Slope 10° (needs at most 8°) +1 more").
  - Globo: pins solo tras aplicar; los que cumplen con color por score, los que no en gris tenue. Ficha y etiqueta con el score según requisitos. Marcador "South Pole · N matching".
- Score: `web/src/scoring/evaluate.ts` (`evaluateSite`, `rankSites`, `utility`) + 7 tests, siguiendo J7 de Javi (0 en el umbral, 1 en el objetivo, media ponderada; omite métricas sin datos; `site.valid` = filtro de seguridad). Va en `src/scoring` por J0 #1 (una sola función, dueño Javi) → **pedir revisión a Javi en el PR**.
- Hallazgo: con los requisitos por defecto de Javi (noche ≤ 100 h, pendiente ≤ 8°) no pasa ninguno de los 20 sitios mock; con pendiente ≤ 15° pasan 3. Es cosa de los mocks, no del filtro.
- Ficha y formulario del globo adaptados al tema nuevo (papel sobre `.space`).
- El mapa 2D (`PolarMap`, de Javi2) sigue mostrando todos los sitios: ocultarlos ahí también requiere PR a `src/layers`.
- Los avisos "synchronously unmount a root" en consola son del doble montaje de `StrictMode` en desarrollo (uno por `<Html>`); no rompen nada y no salen en producción.
- Verificado: lint, typecheck, 40 tests, build; en navegador, la lista oculta → aparece al aplicar → filtra/ordena en vivo, y el globo carga con "South Pole · 3 matching". Pendiente: probar a mano el clic en pins del globo con la ficha nueva.

## 2026-11-14 — Sesión 2 (cierre): plan actualizado y PR
- `docs/10` §5 Marta reescrita con lo acordado (Explore por requisitos de misión sin pesos, ventana de misión, rejilla, sin servidor, iteraciones v0–v5, hito domingo 13:00) y entrada en `decisions/log.md`.
- Rama actualizada con `dev` (#68: alcance toda la Luna, §10). Javi publicará `evaluateSite`/`rankSites` en `@/scoring`, así que el filtro de esta sesión **sale de `src/scoring`** y queda como provisional en `src/globe/requirements.ts` (+ tests), sin tocar carpetas ajenas.
- Pendientes / dependencias:
  - v1: formulario de requisitos de misión + `missionStats.ts` + orden sin pesos (sustituye a los sliders provisionales).
  - Javi: `score`/`weights`/`valid` en `sites.json` (PR a `contracts/`); conciliar §10 (sliders sobre `missionConfig`) con lo acordado hoy.
  - §10 de Javi para Marta: pins por todo el globo (el clúster solo para el polo), clic → `selectedPoint` (cuando Javi2 lo añada al store), luz con `sunDirectionMoonME` de `@/ephem`, mapa de calor global.
  - Javi2: fecha/hora en el Mission Clock; `selectedPoint` en el store.
  - Pablo: heightmap del parche; teselas de horizonte.

## 2026-11-14 — Sesión 3: v1 de Explore, requisitos de misión (#73, rama `martaplatero2002-star/73-requisitos-mision`)
- `missionStats.ts` (puro, 12 tests): ventana (`resolveWindow`, `sliceIndices` con `indexAt`), % de luz, noche más larga, corte de Tierra más largo (null = unknown si falta `earth_visible`), autonomía = batería/consumo, energía media = panel × % luz, `evaluateSite` con textos ("Longest night 38 h ≤ battery autonomy 60 h ✔") y márgenes, `sortEvaluations`.
  - Noche necesita batería + consumo; energía necesita panel + consumo. Un valor suelto no filtra (la UI avisa).
  - Pendiente desde `site.metrics.slope_deg`; si el contrato v1.1 (#70) la marca en `pending_metrics` → "pending terrain" (unknown).
- `requirementsStore.ts` (local): campos añadidos, valores, ventana, `sortBy`, `showNonMatching`. Todo vacío al empezar.
- `useCandidates.ts`: carga las timeseries de los 20 sitios al activar el primer requisito; recalcula con memo y `useDeferredValue`.
- UI (inglés): "+ Add requirement" con campos con unidades y placeholders (nunca valores), ventana (Landing UTC + Days), "Sort by", "N of M sites meet your requirements", top 5 numerado con ✔/✖, "Show non-matching", supuesto de paneles rotulado.
- Ficha: sin score; "Meets X of Y requirements" + lista; "Now (Mission Clock)" (elevación del Sol, sunset/sunrise, Earthset/Earthrise con `hoursUntilChange`); estadísticas en la ventana (o en todos los datos si no hay ventana).
- Globo: sin requisitos no hay pins de candidatos; candidatos en dorado y el top 5 como insignias numeradas (sprites, sin `<Html>`); no-candidatos atenuados solo con "Show non-matching"; ficha con "Meets X of Y".
- Borrado el filtro provisional de la v0 (`ranking.ts`, `requirements.ts`, `requirementText.ts`); Explore ya no escribe en `missionConfig`.
- Verificado: lint, typecheck, 45 tests, build, formato. En navegador: sin requisitos no hay sitios; batería sola → aviso; batería 3000 Wh + consumo 10 W → 10 de 20; pendiente ≤ 15° → 6; corte ≤ 100 h → 1; ventana de 7 días y recorte al rango; ficha correcta. Globo: no comprobado (panel oculto).
- **Para pedir:**
  - Javi2 (`src/core`): `candidateIds: string[] | null` en el store (o `selectedPoint` + lista) para que el mapa 2D (`PolarMap`) muestre los mismos candidatos y oculte el resto sin requisitos.
  - Javi2 (`ExplorePage`): quitar `max-h-[300px]` a la barra izquierda o darle más alto; con requisitos + lista no cabe.
  - Javi2: campo fecha/hora en el Mission Clock (ya en el plan).
  - Javi (#70 / contrato): confirmar `pending_metrics` para `slope_deg`; decidir si `score`/`weights`/`valid` se retiran de `sites.json`; `ComparePage` y `metrics.ts` siguen usando `score`/`valid`.
- Bug reportado (Shackleton rim A, ventana completa: "corte de comunicación 9,0 d en vez de 266 h"): **no era de `missionStats`**. Test con el archivo real añadido (266 h y noche 0 h) y pasa sin cambios; la ficha ya mostraba "Longest comm gap 11.1 d". Los 9,0 d eran la cuenta atrás de "Now" ("Earthrise in"), que empieza en el instante del Mission Clock (hora 50 → 266 − 50 = 216 h). Etiquetas aclaradas: "Countdowns start at this time…", "(whole window)" en la ventana y "not in data range" cuando no hay cambio.
- Rama actualizada con `dev` (#77 efemérides, #78 `@/ephem` + `@/scoring` + `SiteCheckPanel`, #79 catálogo global).
- Regla alineada con Javi (decisión de Marta, 2026-11-14): los requisitos sin dato (pendiente sin terreno, sin `earth_visible`) se muestran como "?" y **no cuentan**; un sitio es candidato si ningún requisito activo falla. Texto "Meets X of Y requirements · Z pending (no data)" (`meetsText`). En el umbral pasa.
- `/review` (gstack) del PR #80: 6 especialistas + Red Team + pasada adversarial. Arreglado: sitios sin serie o con ventana vacía ya no son candidatos (la pendiente sin terreno sigue sin contar), valores ≤ 0 ignorados con aviso, top 5 solo con dato para ordenar, retoques de accesibilidad/maquetación en la barra lateral, test real sin valores exactos. Abierto para el equipo: dos controles de fecha de aterrizaje en Explore (MissionTimingPanel de Javi vs ventana local), mapa 2D aún por score/valid, token de color, cálculo del ranking una sola vez.

## 2026-11-15 — Sesión 4: v5 alunizajes históricos (#84)
- PR del contrato (#86, rama `martaplatero2002-star/84-historic-sites-contract`): `HistoricSite` / `HistoricSitesFile`, `historic_sites.schema.json`, README y validación en `contracts.test.ts` (solo si existe el archivo; incluye "mismas coordenadas que sites.json para los id compartidos").
- Datos (`web/public/data/historic_sites.json`, 25 misiones): las 20 que ya están en el catálogo de Javi (incluida Luna 21, que no estaba en mi lista) reutilizan su `id`, coordenadas y URL (LROC). Nuevas, contrastadas con NSSDCA ("Anthropogenic Impacts and Spacecraft on the Moon") y LROC: Luna 9, Beresheet, Chandrayaan-2 Vikram, HAKUTO-R M1 y Luna 25. Fechas de las 25 desde NSSDCA (día; hora solo cuando la fuente la da: Luna 25 11:58 UTC, HAKUTO-R M1 16:40 UTC).
  - Advertencias: Luna 9 = coordenada de un informe de 1966, el módulo no aparece en LROC (probablemente > 10 km). HAKUTO-R M1 = posición preliminar de LROC.
  - Resultado: 18 éxitos, 3 parciales (SLIM, IM-1, IM-2), 4 fallidas. **2 al sur de 80°S** (IM-1 e IM-2): el contador lo refleja.
  - Agencia, país, resultado, tipo y nota: conocimiento general, sin fuente por misión (anotado en `04-resources`).
- Globo: interruptor "Past landings" (apagado por defecto, "unavailable" si falla la carga) con leyenda por resultado y contador calculado ("25 landings shown · 2 south of 80°S"); marcadores triangulares coloreados por resultado; etiqueta al pasar el ratón; clic → tarjeta propia (agencia, país, fecha, resultado, tipo, nota, enlace "Source"), sin `selectSite`.
- Decisión de Marta: los alunizajes históricos siguen contando como candidatos en Explore (en el mismo punto puede verse el pin y el triángulo).
- Verificado: lint, typecheck, 121 tests, build; en navegador, interruptor y leyenda. Marcadores 3D sin comprobar (panel oculto).
- `/review` de #86 y #89 (6 especialistas + Red Team + adversarial; nada crítico). Arreglado:
  - #86 (contrato): `source` solo `https`; el test exige que cada `historic_landing` de `sites.json` esté en `historic_sites.json` y que los id compartidos sean `historic_landing`.
  - #89: el cargador valida todo lo que muestra la tarjeta y avisa en consola de filas descartadas; cursor y tarjeta se limpian al apagar la capa; leyenda con borde (contraste); los choques ya no dicen "Crashed · Crash site".
  - Decisiones de Marta: sin triángulo encima de un candidato visible (su tarjeta muestra "Past landing"); 7 misiones más (Luna 13, Luna 20, Surveyor 3/5/6/7, HAKUTO-R M2) → 32; contador "32 sites (5 crashes) · 2 south of 80°S"; el interruptor reintenta la carga tras un error.

## 2026-11-15 — Sesión 5: v2 del globo (#92, rama `martaplatero2002-star/92-polar-patch`)
- Datos revisados: `terrain/heightmap.json` (1025×1025, vértices, ±304006 m, LDEM_80S_80MPP_ADJ) y `ephem/index.json` cuadran con sus cabeceras. `terrain/valid.u8` sí está (corregido: al principio lo di por ausente); se usa como máscara y, si faltara, el NaN de `heights.f32`. El core carga `web/public/data/layers.json` (mock), no `terrain/layers.json` (real) — pedir a Javi2. `@/ephem` ya interpola el Sol (`sunDirectionMoonME`): se reutiliza.
- Paso 0: `isCandidateSite` (missionStats) + `useCandidates` solo con `kind: "candidate"`: Explore pasa de 59 a 39 sitios. Con batería 20 000 Wh / 50 W (400 h) no pasa ninguno; con 50 000 Wh, 26 de 39; con 200 000 Wh, 39.
- Paso 1: luz según la fecha. `sunLight.ts` (+6 tests): `moonMeToThree` = (X, Z, −Y), cobertura 2026–2055 desde `ephem/index.json`, estado ok / loading / no_ephemeris. `@/ephem` de Javi carga el año (caché) e interpola el Sol; no se duplica. En el globo: luz direccional en la dirección del Sol del Mission Clock, ambiente 0,04 (sin atmósfera); sin efemérides → luz fija y aviso "No ephemeris for this date · fixed lighting". Comprobado: al abrir el 3D solo se descargan `ephem/index.json` y `ephem/2027.bin`. Línea día/noche con Play: sin comprobar visualmente (panel oculto).

### Paso 2 — parche polar 3D (2026-11-15)
- `terrain.ts`: inversa estereográfica polar sur, rejilla de la cabecera, altura bilineal y `buildPatchArrays` (radio (R+h·exag)/R, solo triángulos con los 3 vértices válidos, normales hacia fuera). 10 tests.
- `terrainStore.ts`: carga perezosa de `heightmap.json` + `heights.f32` + `valid.u8` (opcional; detecta el index.html que Vite devuelve si falta). Se dispara al acercar la cámara al polo (<1.8, mirando al sur) o con el marcador del polo.
- `PolarPatch.tsx`: malla gris mate (#8c8c8c, sin hillshade), 513² por defecto (paso 2), "High detail" 1025². Mientras está cargado, la esfera texturizada se corta al sur de −80° (thetaLength + 0.05° de solape, UV corregidas).
- `PatchControls.tsx`: interruptores High detail / Vertical ×2 y etiqueta "Vertical exaggeration ×2 (shadows not to scale)".
- Medido en el navegador: descarga ~96 ms en local; construir la malla 513² = 410 k triángulos en ~160 ms, 1025² = 1,64 M triángulos en ~460 ms. FPS sin medir (el panel del navegador estaba oculto): pendiente de que Marta lo vea.


### Paso 3 — sombras (2026-11-15)
- `SunLight` (PolarPatch.tsx) sustituye a la directionalLight: con el parche cargado proyecta sombras (castShadow + receiveShadow en la malla), cámara ortográfica ajustada a la esfera envolvente del parche (centro (0, −0.992, 0), radio 0.185), mapa 4096² (~160 m por téxel), bias −5e-5 y normalBias 3e-4 por el Sol rasante. Sin parche no hay coste de sombras.
- Etiqueta en el panel: "Illustrative shading — official sunlight figures come from the data pipeline".
- Sin verificar visualmente (panel oculto): el bias puede necesitar ajuste si aparece acné o "peter-panning".
