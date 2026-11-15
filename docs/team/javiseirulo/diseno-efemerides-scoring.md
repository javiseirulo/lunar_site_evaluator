# Efemérides, validez y score: cómo está diseñado y qué podéis usar ya

Autor: @javiseirulo. Fecha: 2026-11-14. Ya está en `dev`: #70 (contrato v1.1), #77 (efemérides Python), #78 (`@/ephem` + `@/scoring`).
Este documento es para el equipo y vuestros Claude. Las definiciones exactas están en `contracts/README.md` (sección v1.1), que es la referencia.

## 1. La idea en una frase
Para **cualquier punto de la Luna** y **cualquier ventana de misión entre 2026 y 2055** calculamos dónde están el Sol y la Tierra cada hora. De ahí sacamos las métricas (luz, noches largas, visibilidad de la Tierra) y decimos si el sitio **cumple los requisitos de la misión** (válido o no válido, con márgenes) y **cuánto de bien** los cumple (score de 0 a 1).

## 2. Las piezas

```
python/ephem (SPICE, offline)  ──►  web/public/data/ephem/<año>.bin  ──►  @/ephem (navegador)  ──►  @/scoring
  kernels JPL DE440 + MOON_ME          Sol y Tierra cada hora, 30 años      cielo en cualquier lat/lon        validez + score
  validado con JPL Horizons            ~210 KB por año                      buildTimeseries()                 evaluateSite(), rankSites()
```

- **`python/ephem/`**: usa SPICE con los kernels oficiales de JPL (DE440s y la orientación lunar MOON_ME). Genera, para cada hora de 2026 a 2055, el vector unitario hacia el Sol y el vector a la Tierra en km.
  - Validado contra **JPL Horizons** en 7 sitios (5 del polo sur, Apollo 11 y Chang'e 4) y 6 fechas: **error máximo 0,00068°**, con objetivo < 0,01°. Informe: `docs/validation/horizons-check.md`.
- **`@/ephem` (web)**: lee esos binarios y calcula en el navegador el acimut y la elevación del Sol y de la Tierra **en cualquier punto**, sin servidor.
  - `skyAt(lat, lon, t)`: Sol y Tierra en un instante, para Street View o para iluminar el globo.
  - `sunDirectionMoonME(t)`: dirección del Sol, para la luz del globo 3D.
  - `buildTimeseries(sitio, horizonte, inicio, fin)`: devuelve exactamente el mismo tipo `Timeseries` que los ficheros estáticos, así que todo lo que ya lee timeseries funciona igual.
  - `useHorizon(id)`: horizonte de terreno de Pablo si existe; si no, horizonte plano (marcado `"flat (no terrain)"`).
- **`@/scoring` (web)**: la **única** implementación de validez y score. El export de Python la replica y un fixture (`contracts/fixtures/golden-score.json`) comprueba que dan lo mismo.
- **`SiteCheckPanel`**: panel ya hecho que muestra VALID/INVALID, cada requisito con su valor, umbral y margen, el desglose del score y la robustez (±3 días). Funciona con el sitio seleccionado o con una lat/lon libre. **Todavía no está colocado en ninguna página.**

## 3. Física (resumen; el detalle está en contracts/README.md)
- Luna esférica de R = 1737,4 km y observador a 5 m del suelo. Ejes locales este-norte-arriba; la Tierra con paralaje exacta.
- **Sol**: se mide qué fracción del disco (radio 0,2666°) está sobre el horizonte. Así un sol rasante del polo cuenta medio, no todo o nada. `lit` = al menos la mitad del disco visible.
- **Tierra visible** = elevación de la Tierra > horizonte + 2° de margen de antena.
- **Horizonte**: mientras no llegan los perfiles de Pablo, horizonte plano. Fuera de los polos es razonable; en los polos subestima las sombras del relieve, y lo decimos en la UI.

## 4. Validez y score (decisiones de diseño)
- **Válido = cumple todos los requisitos de la misión** (`MissionConfig.requirements`): luz mínima, noche más larga, visibilidad de la Tierra, apagón de comunicaciones más largo, pendiente, etc. En el umbral exacto pasa. Es un "sí o no" explicable: cada requisito lleva su margen ("noche más larga 142 h > 100 h").
- **Métricas pendientes**: `slope_deg` y `psr_dist_km` dependen del terreno de Pablo. Hasta que llegue, van en `pending_metrics`: **no cuentan** ni para la validez ni para el score, y la UI muestra "—" o "pending terrain". Una métrica que falta se trata igual: nunca sale NaN.
- **Score** = media ponderada de utilidades por criterio, entre 0 y 1: la utilidad vale 0 en el umbral y 1 en el objetivo.
  - **No hay normalización entre sitios**: el score de un sitio no cambia al añadir o quitar otros.
  - El ranking **solo deja competir a los válidos**: primero todos los válidos ordenados por score; los no válidos van detrás, con la etiqueta "not valid".
- **Escenarios de Mission (Cristóbal)**: son cambios parciales sobre la configuración por defecto. Se combinan con `mergeMissionConfig(parcial)`.
- **Ventana de misión**: `missionWindow(config, sitio)` da [aterrizaje, aterrizaje + días en superficie]. En modo Mission el aterrizaje se calcula con `computeArrival`: transferencia Hohmann con la distancia Tierra–Luna real y espera en órbita polar hasta pasar por encima del sitio (en el polo, 0 días; en el ecuador, hasta ~13,7 días).

## 5. Qué podéis usar ya (todo importado de `@/ephem` y `@/scoring`)
| Quién | Para qué | Función |
|---|---|---|
| Marta (globo/Explore) | Iluminación real del globo | `sunDirectionMoonME(t)` |
| Marta | Filtro por requisitos duros (tu Explore sin pesos) | `evaluateSite(...).valid` y `.checks`, que son justo requisitos duros; el score es opcional y puedes no mostrarlo |
| Marta / Javi2 | Clic en cualquier punto de la Luna → evaluación | `buildTimeseries` + `evaluateSite`, o directamente `<SiteCheckPanel />` |
| Pablo (Street View) | Sol y Tierra en el cielo en cualquier lat/lon | `skyAt(lat, lon, t)` |
| Pablo | Formato de horizontes que consume la web | `HorizonProfile` (`contracts/horizon.schema.json`) en `web/public/data/horizon/<id>.json` |
| Cristóbal (Mission) | Simular N días en un sitio y dar el veredicto | `buildTimeseries` + `evaluateSite`; `mergeMissionConfig` para los escenarios; `computeArrival` |
| Javi2 (core/UI) | "—" en métricas pendientes, colocar el panel | `site.pending_metrics`, `<SiteCheckPanel />` |
| Marta (globo / mapa polar) | Mapa de calor de métricas (año 2027, horizonte plano) | `loadGrid('global_1deg' \| 'south_5km')` + `sampleGrid(grid, metric, lat, lon)`; ver "Cómo pintar el heat map" abajo |

Nota para Marta: tu decisión de "requisitos sin pesos" encaja. La validez de `@/scoring` **es** un filtro de requisitos duros y no usa pesos; los pesos solo afectan al score, que es opcional mostrar.

**Cómo pintar el heat map (para Marta).** `grid/index.json` lista dos rejillas Float32: `global_1deg` (equirrectangular 360×180, fila 0 = lat 89.5, lon −179.5→179.5) y `south_5km` (estereográfica polar sur 122×122, mismos `bounds_m`/`radius_m`/`lat_limit` que `layers.json`, fila 0 = max_y, NaN fuera de −80°). Métricas: `illum_pct`, `max_dark_hours`, `earth_vis_pct`, `max_blackout_hours`, `sun_el_mean_deg`. Globo: `const g = await loadGrid('global_1deg')`, recorre `g.data` del plano `k = g.def.metrics.indexOf(m)` (offset `k*width*height`), pasa cada valor por la paleta a un `ImageData` width×height y úsalo como `CanvasTexture` en la esfera (UV equirrectangular, `u = 0` en lon −180; comprobad la rotación de la esfera igual que con la textura actual). Mapa polar: igual con `south_5km`, dibujado en el mismo rectángulo `bounds_m` que las capas PNG (NaN → transparente). Para un tooltip basta `sampleGrid(g, m, lat, lon)`. Rangos útiles: pct en 0–1, horas en 0–8760 (escala log o recorte a ~720 h), `sun_el_mean_deg` 0–~25.

## 6. Catálogo de sitios (#48)
- `python/export/catalog.yaml`: **59 sitios con fuente**, sin ninguno inventado: 38 del polo sur, 3 del polo norte, 16 de la cara visible y 2 de la cara oculta, incluidos Apollo, Chang'e, Chandrayaan-3, SLIM, IM-1, IM-2 y Blue Ghost como aterrizajes históricos.
- Se conservan los 20 ids de los mocks. Algunos se han movido a la coordenada publicada más cercana, por ejemplo `plain_81s` → South Idel'son L (Flahaut 2020).
- Lista para Pablo (qué horizontes hacen falta): `docs/team/javiseirulo/catalog-for-pablo.md`.

## 7. Qué falta (siguiente)
1. **Export real** (`python/export/all.py`): `sites.json`, `timeseries/` y `manifest.json` con `mock: false` sobre el catálogo, para que toda la web deje de usar mocks.
2. Mapa de calor global de 1° y polar de 5 km (`grid/*.bin`).
3. Al llegar los horizontes de Pablo: volver a lanzar el export y quitar `pending_metrics`.
