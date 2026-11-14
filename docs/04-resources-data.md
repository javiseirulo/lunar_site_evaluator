# 04 — Recursos, datos, APIs y librerías

> **Append-only.** Añade al final con fecha y autor. Todo lo que USEMOS en la entrega debe copiarse a *References*.
> Estado de verificación: ✅ leído en la fuente · ⚠️ por verificar (licencia/URL/formato).

## Datos NASA (núcleo — obligatorio usar ≥1)
| Recurso | Qué da | Enlace | Estado |
|---|---|---|---|
| JPL Horizons (web + **API**) | Efemérides Sol/Tierra vistas desde un punto de la superficie lunar (observer table). Moon sin refracción | https://ssd.jpl.nasa.gov/horizons/ · API: https://ssd-api.jpl.nasa.gov/doc/horizons.html · Manual: https://ssd.jpl.nasa.gov/horizons/manual.html | ✅ |
| NAIF **SPICE** kernels (DE440/441, PCK lunares, MOON_PA) | Cálculo local offline y exacto (libración incluida) | https://naif.jpl.nasa.gov/naif/data.html | ⚠️ |
| LOLA LDEM (PDS Geosciences) | Topografía lunar de alta resolución | https://pds-geosciences.wustl.edu/missions/lro/lola.htm · Data Node: http://imbrium.mit.edu/ | ✅ |
| **LOLA 5 m/px South Pole sites (Barker et al.)** | DEMs 5 m, pendientes y mapas de iluminación de sitios de aterrizaje del polo sur (Sites 1, 4, 7, 11, NPC, NPD) | https://pgda.gsfc.nasa.gov/products/78 (cita obligatoria: Barker et al. 2021, P&SS 203, 105119) | ✅ |
| LOLA DEM global 118 m (USGS) | DEM global ligero (8 GB GeoTIFF) | https://astrogeology.usgs.gov/search/map/moon_lro_lola_dem_118m | ✅ |
| Moon Trek WMTS (API de teselas) | Capas de imagen/topografía por tiles, sin descargar GB | https://trek.nasa.gov/tiles/apidoc/index.html · https://api.nasa.gov/ | ✅ |
| Quickmap (LROC/ASU) | Imágenes LROC, iluminación WAC, herramienta de exploración | https://quickmap.lroc.asu.edu/ | ✅ |
| LPI Lunar South Pole Atlas | Mapas PDF: pendientes, PSR, earthshine, regiones candidatas Artemis | https://www.lpi.usra.edu/lunar/lunar-south-pole-atlas/ | ✅ |
| PDS Lunar Orbital Data Explorer (ODE) | Buscador de productos LRO | https://ode.rsl.wustl.edu/moon/ | ⚠️ |

## Socios de agencias (suma puntos si se usan)
- CSA (listado en el reto): https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/
- Otros socios 2026: ESA, JAXA (SELENE/Kaguya DEM), ISRO (Chandrayaan), KASA (KPLO), UKSA, Agencia Espacial Española, ASI, AEB, TUA, MBRSC. ⚠️ buscar datasets lunares abiertos de cada una.

## Librerías y código abierto candidatos
| Librería | Uso | Enlace |
|---|---|---|
| **spiceypy / SPICE** | Posiciones exactas Sol/Tierra desde la Luna, libración | https://github.com/AndrewAnnex/SpiceyPy |
| **spicedmoon** | Geometría lunar (coordenadas selenográficas → ángulos) con SPICE | https://pypi.org/project/spicedmoon/ |
| Skyfield | Efemérides en Python (incl. libración lunar, sub-Earth/sub-solar) | https://rhodesmill.org/skyfield/ · https://rhodesmill.org/skyfield/planetary.html#computing-lunar-libration |
| Astronomy Engine | Posiciones Sol/Luna/planetas, multi-lenguaje (JS incluido) | https://github.com/cosinekitty/astronomy |
| GDAL / rasterio | Leer GeoTIFF LOLA, recortar, calcular pendiente/horizonte | https://gdal.org |
| CesiumJS / three.js / deck.gl | Visualización 3D/2D en web | ⚠️ verificar versión con Context7 al elegir |
| Horizons API wrappers | Ej. https://github.com/SciNim/horizonsAPI | — |

## Ideas de cálculo (a validar, no son decisión)
- Elevación/azimut de Sol y Tierra: SPICE/Horizons desde (lat, lon, altura) selenográficos.
- **Horizonte con terreno**: ray-marching / perfil de horizonte por azimut sobre el DEM LOLA → comparar con elevación del cuerpo → ¿visible o no?
- Ventanas: series temporales de visibilidad Sol/Tierra → duración de luz, tiempo hasta sunset/earthset, eclipses por terreno.
- Validación: contrastar contra Horizons web y contra mapas de iluminación publicados (Barker/LPI).

## Ofertas globales (Global Offers) — PENDIENTE (requiere login)
https://www.spaceappschallenge.org/2026/global-offers/ → **un humano del equipo, logueado, copie aquí** créditos cloud, APIs, herramientas, etc.

## Registro de recursos añadidos
| Fecha | Autor | Recurso | Notas |
|---|---|---|---|
| 2026-11-14 | claude (sesión de javiseirulo) | Tabla inicial | Investigación inicial vía Firecrawl |
