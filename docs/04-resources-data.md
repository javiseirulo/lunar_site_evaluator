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

## Ofertas globales 2026 (Global Offers)
Fuente: https://www.spaceappschallenge.org/2026/global-offers/ (requiere login; copiado el 2026-11-14). Todas opcionales, "Claim Offer" en cada una.
⚠️ Varias piden tarjeta/teléfono para verificar: lo decide cada persona, no la IA. Cualquier SI (Copilot, etc.) → anotar en `si-usage-log.md`.

| Oferta | Qué da | Utilidad para nuestro reto | Enlace |
|---|---|---|---|
| **Microsoft Azure** | $200 de crédito 30 días + servicios gratis (algunos siempre, otros 12 meses). Pide teléfono, tarjeta no prepago y cuenta MS/GitHub | Alta: alojar backend/cálculo pesado (SPICE/horizonte) | https://azure.microsoft.com/en-us/free/ |
| **Microsoft Planetary Computer** | Catálogo de datos + STAC API, público sin cuenta (algunos datos piden token gratis) | Media-baja: sobre todo datos terrestres; comprobar si hay algo lunar | https://planetarycomputer.microsoft.com/ |
| Microsoft Copilot | Asistente SI gratis | Es SI → declarar | https://www.microsoft.com/en-us/microsoft-copilot |
| GitHub Copilot (Free) | 2.000 completados/mes + chat/agente limitado, sin tarjeta | Es SI (código) → declarar | https://github.com/features/copilot |
| Microsoft Teams Free | Reuniones ≤100 personas/60 min, chat, 5 GB | Comunicación del equipo | https://www.microsoft.com/en-us/microsoft-teams/teams-free |
| **Google Cloud** | $300 de crédito 90 días, sin cobro automático; pide tarjeta (incluye Firebase y Google Maps API) | Alta: hosting (Firebase/Cloud Run), almacenar datos | https://cloud.google.com/free/docs/free-cloud-features#free-trial |
| Meteomatics Weather API | 1.000 consultas/día, activo durante el hackathon; datos meteorológicos de la **Tierra** | Baja (el reto es lunar) | https://www.meteomatics.com/en/meteomatics-and-nasa-space-apps-challenge/ |
| Miro Education | Gratis 2 años estudiantes / siempre educadores | Pizarra de equipo | https://miro.com/education-whiteboard/ |
| Miro Business | 14 días gratis (pide tarjeta; cancelar antes) | Pizarra de equipo | https://miro.com/ |
| **Miro Board Templates** | Plantillas Hackathon Template Board y Hackathon Project Coach Board, gratis | Útil para organizar el equipo y la ideación | https://miro.com/templates/profile/nasa-space-apps-challenge/ |
| **Dominio gratis + hosting 1 año (GoDaddy Registry / Porkbun)** | Dominio no premium + SSL 1 año | Útil: URL pública limpia para el "Link to Final Project" (pedir clasificación FortiGuard si es web nueva) | https://www.spaceapps.earth/ |

Preguntas sobre ofertas: categoría *Global Offers* en Space Apps Connect (https://github.com/nasa/spaceapps).
Contactos de soporte: Microsoft samfal@microsoft.com · Google cloudstartupsupport@google.com · Meteomatics support@meteomatics.com · Porkbun support@porkbun.com.

## Registro de recursos añadidos
| Fecha | Autor | Recurso | Notas |
|---|---|---|---|
| 2026-11-14 | claude (sesión de javiseirulo) | Tabla inicial | Investigación inicial vía Firecrawl |
| 2026-11-14 | claude (sesión de javiseirulo) | Global Offers 2026 | Pegado por javiseirulo desde la página con login |
| 2026-11-14 | @javocruz | Librerías web (MIT salvo indicación): React 19, React Router 7, zustand 5, Vite 6, Tailwind CSS 4, three.js, @react-three/fiber, @react-three/drei, motion, lucide-react (ISC), clsx, tailwind-merge; fuentes Inter y JetBrains Mono (SIL OFL) vía @fontsource | Versiones exactas en `pnpm-lock.yaml`. Añadir a *References* de la entrega |
| 2026-11-14 | @javocruz | Fuentes Inter y JetBrains Mono **retiradas** (PR #60) | La web usa ahora fuentes del sistema (Verdana, Trebuchet MS, Lucida Console): no hay que citarlas en *References* |
| 2026-11-14 | pabloizgui / Codex | [PGDA South Pole LOLA DEM Mosaic, producto 81](https://pgda.gsfc.nasa.gov/products/81) | Descarga del GeoTIFF de alturas `ldem_87s_5mpp.tif`, 87–90°S, 5 m/píxel, 3.465.285.714 bytes. En curso; no se da por validado. Cita: Barker et al. 2021, P&SS 203, 105119, https://doi.org/10.1016/j.pss.2020.105119. Procedencia en config/terrain-sources.json. |
| 2026-11-14 | pabloizgui / Codex | [Cesium Moon, documentación oficial](https://cesium.com/platform/cesium-ion/content/cesium-moon/) | Fuente visual global 3D Tiles, asset de ejemplo 2684829; terreno ~5 m entre 87,5°S y 90°S. Acceso ion del equipo pendiente de confirmar. No se ha descargado la malla global ni probado una escena. |
| 2026-11-14 | pabloizgui / Codex | [Reporte de usuario de desfase Cesium/LOLA](https://community.cesium.com/t/46282) | Hipótesis de validación, no corrección confirmada ni evidencia de que toda la malla tenga ese desfase. |
| 2026-11-14 | pabloizgui / Codex | [rasterio](https://rasterio.readthedocs.io/) 1.4.4 | Lectura de cabecera GeoTIFF y herramienta de inspección local; dependencia de desarrollo, sin alterar el DEM. |
| 2026-11-14 | pabloizgui / Codex | [Planes Cesium ion](https://cesium.com/platform/cesium-ion/pricing/) | Verificación nueva: Community gratuito, individual, 10 GB de almacenamiento y 15 GB/mes de streaming; elegibilidad personal/no comercial/evaluación y actividades educativas no financiadas según FAQ. No se ha inspeccionado ni cambiado la facturación de la cuenta. |
| 2026-11-14 | pabloizgui / Codex | [Cuotas ion](https://cesium.com/learn/ion/optimizing-quotas/) y [tokens](https://cesium.com/learn/ion/cesium-ion-access-tokens/) | Descargar NASA al disco no consume almacenamiento ion. Token público assets:read restringido a asset y URLs si se integra; nunca permisos privados en el bundle. |
| 2026-11-14 | pabloizgui / Codex | [Rasterio: lectura por ventanas](https://rasterio.readthedocs.io/en/stable/topics/windowed-rw.html) | Exportador propio de recortes para Street View. Primera ventana real de 256×256 a 5 m extraída del parcial NASA; procedencia, máscara y escalas en data/derived/terrain/first-real-patch/manifest.json. No sustituye validación de horizonte. |
| 2026-11-14 | pabloizgui / Codex | [Cesium Moon](https://cesium.com/platform/cesium-ion/content/cesium-moon/) y [PGDA 81](https://pgda.gsfc.nasa.gov/products/81) | Fuentes primarias reconsultadas para #59: malla visual 3D Tiles de resolución variable y DEM científico polar MOON_ME/DE421. Acceso/render/validación completa pendientes; no se publican datos crudos. |
| 2026-11-14 | pabloizgui / Codex | [CesiumJS / Vite](https://cesium.com/blog/2024/02/13/configuring-vite-or-webpack-for-cesiumjs/) y [tokens ion](https://cesium.com/learn/ion/cesium-ion-access-tokens/) | CesiumJS 1.145.0 con engine 26.3.0/widgets 16.2.0 fijados para evitar exports incompatibles; vite-plugin-static-copy 2.3.2. Motor propio en Street View; token público assets:read limitado a Moon/URLs. Ningún token se ha guardado en Git. |
| 2026-11-14 | @javocruz | Fuentes **Audiowide** y **Nunito** (SIL Open Font License) vía @fontsource | Títulos y texto de la web (PR del rediseño synthwave). Añadir a *References* |
| 2026-11-14 | @javocruz | NASA Graphics Standards Manual (1976, NHB 1430.2) y colores del insignia (#0B3D91, #FC3D21) | Referencia de paleta y tipografía (Helvetica) de la web; solo colores, sin marcas. https://www.nasa.gov/wp-content/uploads/2015/01/nasa_graphics_manual_nhb_1430-2_jan_1976.pdf |
| 2026-11-14 | @javocruz | Fuentes Nunito y Audiowide **retiradas** | La web usa Helvetica/Arial del sistema |
