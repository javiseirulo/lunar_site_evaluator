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
| 2026-11-14 | pabloizgui / Codex | [PGDA 90, A New View of the Lunar South Pole from LOLA](https://pgda.gsfc.nasa.gov/products/90), Barker et al. (2023), [DOI artículo](https://doi.org/10.3847/PSJ/acf3e1), [DOI datos](https://doi.org/10.60903/gsfcpgda-lola-spole) | Verificados los productos `LDEM_80S_80MPP_ADJ.TIF` (altura en m, 189158392 bytes) y `LDSM_80S_80MPP_ADJ.TIF` (pendiente en grados, 241594035 bytes), MOON_ME/DE421, 80 m por píxel. Fuente para la entrega polar de Marta y las capas de Javi2; producto original y resolución efectiva no equivalen a la malla reducida. |
| 2026-11-14 | pabloizgui / Codex | [Rasterio](https://rasterio.readthedocs.io/en/stable/), [GDAL](https://gdal.org/) y [NumPy](https://numpy.org/) | Lectura GeoTIFF, remuestreo, máscaras y binarios; rasterio 1.4.4 fijado en `requirements-terrain.txt`. Metadatos de los productos derivados reconocen la asistencia de IA. |
| 2026-11-14 | pabloizgui / Codex | [Matplotlib](https://matplotlib.org/) | Figura científica de comprobación de elevación/pendiente en el paquete de entrega; datos NASA y procesamiento/plot asistido por Codex indicados en el pie visible. No es una dependencia de la web. |
| 2026-11-14 | pabloizgui / Codex | [PGDA 90, DEM 60S de 240 m](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_60S_240MPP_ADJ.TIF) y [Barker et al. (2023)](https://doi.org/10.3847/PSJ/acf3e1) | Archivo de 218961039 bytes, modificado 2023-07-07 según HTTP. Relieve lejano fuera del parche visual para la configuración inicial de 300 km, validación hasta 310 km. El artículo usa mapas anidados hasta 310 km; esto respalda el enfoque, no acredita convergencia de nuestro productor. |
| 2026-11-14 | @javocruz | Fuentes **Audiowide** y **Nunito** (SIL Open Font License) vía @fontsource | Títulos y texto de la web (PR del rediseño synthwave). Añadir a *References* |
| 2026-11-14 | @javocruz | NASA Graphics Standards Manual (1976, NHB 1430.2) y colores del insignia (#0B3D91, #FC3D21) | Referencia de paleta y tipografía (Helvetica) de la web; solo colores, sin marcas. https://www.nasa.gov/wp-content/uploads/2015/01/nasa_graphics_manual_nhb_1430-2_jan_1976.pdf |
| 2026-11-14 | @javocruz | Fuentes Nunito y Audiowide **retiradas** | La web usa Helvetica/Arial del sistema |
| 2026-11-14 | @javiseirulo | Meeus, J. (1998) *Astronomical Algorithms*, 2nd ed., cap. 47 (serie truncada de la distancia Tierra–Luna, Tabla 47.A) | Usado en `web/src/scoring/arrival.ts` para el tiempo de transferencia Hohmann; validado contra el ejemplo 47.a (<50 km). Se sustituirá por el vector Tierra de SPICE. Añadir a *References* |
| 2026-11-14 | pabloizgui / Codex | [Cesium ion access tokens](https://cesium.com/learn/ion/cesium-ion-access-tokens/) y [pricing](https://cesium.com/platform/cesium-ion/pricing/) | Revisados para ejecutar la app con la cuenta de Pablo: token público assets:read limitado a Moon/orígenes locales, cuotas de la cuenta propietaria; pruebas del endpoint local 200 / externo 403. Sin token literal en Git. |
| 2026-11-14 | @martaplatero2002-star | Textura del globo: `lroc_color_poles_4k.tif` (4096×2048) del CGI Moon Kit, NASA Scientific Visualization Studio — https://svs.gsfc.nasa.gov/4720 — LROC WAC color con los polos rellenados con LOLA | Convertida a JPG (2,9 MB) en `web/public/textures/lroc_color_poles_4k.jpg`; la usa el globo 3D (`web/src/globe/`). Citar en *References*: NASA SVS CGI Moon Kit (créditos LROC/ASU y LOLA/GSFC según la página). Sin logotipos. |

### 2026-11-14 — Pablo: base global y nombres del Street View

- NASA LRO LOLA GDR **LDEM_64 V3.1** (creado 2019-03-15), ME/polar axis DE421,
  Int16 little-endian, 23040×11520, 64 píxeles/grado. Elevación = DN×0,5 m;
  `OFFSET=1737400` se usa solo para radio. Base global de prueba de unos 474 m,
  no sustituto del detalle polar. [Etiqueta PDS](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_64.lbl),
  [IMG oficial](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_64.img).
  Descarga completa 530841600 bytes; SHA-256 local
  `1c4958699d4cffd7e777d51421b6044bba300aa0bef286a544309efb082cdbd6`.
  Incluye interpolación del productor y posibles artefactos entre bandas de 45°;
  la etiqueta y el origen se conservan junto al fichero ignorado.
- **IAU/USGS Gazetteer of Planetary Nomenclature**, catálogo lunar de centros,
  control LOLA 2011, coordenadas planetocéntricas y longitudes este.
  [Descripción y coordenadas](https://planetarynames.wr.usgs.gov/GIS_Downloads),
  [KMZ oficial](https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.kmz).
  Exportados 2023 accidentes aprobados, omitiendo los satélites con letras para
  reducir ruido visual. Cada nombre conserva su enlace oficial; SHA del KMZ en
  `web/public/data/terrain/lunar-names.json`. Los puntos no son cumbres medidas.
- Cesium: [guía oficial CustomShader](https://github.com/CesiumGS/cesium/blob/main/Documentation/CustomShaderGuide/README.md)
  y código local engine 26.3.0 (`Picking.js`, `ApproximateTerrainHeights.js`).
  Luz de lectura artificial, sin atribuirle fidelidad fotométrica. El rayo de
  muestreo se inicia sobre 30 km para evitar el límite terrestre inicial de 9 km.
| 2026-11-14 | pabloizgui | Paquete local `mission_assets_48_completos.zip`, 48 PNG aportados por Pablo (#74, Mission #49) | Originales en `web/public/game/`; inventario SHA-256/dimensiones en `assets-manifest.json`. Ilustraciones artísticas, no datos NASA ni terreno científico. Herramienta/proceso/licencia no especificados en el ZIP; crédito final pendiente de confirmar con Pablo. |
| 2026-11-14 | pabloizgui | Aclaración de procedencia de #74 y documento privado `generacionimagenes.md` | Pablo confirma que creó las imágenes con Codex a partir del documento facilitado por Cristóbal. El contenido del documento se conserva en local; solo se publica su SHA-256 para trazabilidad. Formatos reales: 38 PNG y 10 WebP con extensión png; bytes originales preservados. Declarar autoría y uso de IA en la entrega; licencia no inferida. |
| 2026-11-14 | @javiseirulo | Catálogo de sitios (`python/export/catalog.yaml`, #48), fuentes: Wueller et al. 2026, JGR Planets 131(3) e2025JE009434 (https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434); De Rosa et al. 2012, PSS 74:224–246 (https://arxiv.org/abs/1208.5587); Flahaut et al. 2020, PSS 180:104750 (https://hal.science/hal-02345336); Gläser et al. 2018, PSS 162:170–178 (https://ntrs.nasa.gov/citations/20170007365); Wagner et al. 2017, Icarus 283:92–103 + tabla LROC (https://lroc.im-ldi.com/images/938); LROC featured images 1087, 1172, 1314, 1358, 1360, 1374, 1407, 1408 (https://lroc.im-ldi.com/images/<n>) | Coordenadas de 59 sitios (38 polo sur, 3 polo norte, 16 cara visible, 2 cara oculta), cada una con su fuente en el YAML. `plain_81s` reubicado a South Idel'son L (Flahaut 2020, sitio 12) con OK de @javiseirulo |
| 2026-11-15 | @martaplatero2002-star | Alunizajes históricos (`web/public/data/historic_sites.json`, #84): NSSDCA, "Anthropogenic Impacts and Spacecraft on the Moon" (https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html; fechas de las 25 misiones y coordenadas de Luna 9); LROC 1101 Beresheet, 1131 Vikram (Chandrayaan-2), 1302 HAKUTO-R M1, 1311 Luna 25 (https://lroc.im-ldi.com/images/<n>) | Las 20 misiones que ya están en el catálogo de Javi reutilizan su `id`, coordenadas y URL (LROC 938 = Wagner et al. 2017, y las imágenes LROC citadas arriba); las 5 nuevas se contrastaron con NSSDCA y LROC. Luna 9: coordenada de un informe de 1966; según NSSDCA el módulo no aparece en las imágenes LROC y estará a más de 10 km. HAKUTO-R M1: posición preliminar según LROC. Agencia, país, resultado, tipo y nota de contexto, redactados con conocimiento general (sin fuente por misión). Sin logotipos ni insignias. |
| 2026-11-15 | @martaplatero2002-star | Alunizajes históricos, ampliación tras `/review` (#84): Luna 13, Luna 20, Surveyor 3/5/6/7 y HAKUTO-R Mission 2 con fecha y coordenadas de la misma tabla NSSDCA (https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html); Luna 13 citada allí a Siddiqi (2002, 2018) y Ulivi y Harland (2004), las demás imaged by LROC | Total 32 misiones (24 éxitos, 3 parciales, 5 choques). Para las misiones de la tabla LROC 938 se usa la posición del módulo de aterrizaje (LM/lander), no la de ALSEP o rovers |
| 2026-11-14 | @Manuelcgg165 (búsqueda asistida) | Umbrales del módulo Mission, ⚠️ tomados de resúmenes, verificar en la fuente: Williams et al. 2017, *Icarus* 283, 300–325, DOI 10.1016/j.icarus.2016.08.012 (Diviner: máximas ecuatoriales 387–397 K, mínima ~95 K) · [VIPER planning, NTRS 20220008301](https://ntrs.nasa.gov/api/citations/20220008301/downloads/2022-06-02-spaceops-viper-planning.pdf) (≤ 50 h de oscuridad) · [Artemis overview, NTRS 20250009323](https://ntrs.nasa.gov/api/citations/20250009323/downloads/ArtemisOverview2025IntSPAPPSChallenge.pdf) y [HLS update 2024, NTRS 20240009596](https://ntrs.nasa.gov/api/citations/20240009596/downloads/ArtemisHLSUpdate_2024.pdf) (pendiente de aterrizaje < 10°) | Uso: reglas de derrota en `docs/team/manuelcgg165/mission-design.md` §4 |
| 2026-11-15 | @martaplatero2002-star | Globo v2 (#92): relieve polar 3D desde `terrain/heightmap.json` + `heights.f32` + `valid.u8` (entrega de Pablo a partir de LOLA `LDEM_80S_80MPP_ADJ`, PGDA 90, Barker et al. 2023, fila de arriba) y luz del Sol por fecha desde `ephem/` (efemérides de Javi generadas con SPICE, fila de NAIF) | Sin fuentes nuevas: reutiliza las ya citadas. El sombreado del globo es ilustrativo; las cifras de iluminación salen del pipeline de datos. |

## 2026-11-15 — Pablo: catálogo, polo norte, PSR y QR local

- NASA PGDA 98, [Lunar north-pole topography and illumination](https://pgda.gsfc.nasa.gov/products/98): LDEM_80N_80MPP_ADJ (80 m), LDEM_60N_240MPP_ADJ (240 m), LDSM_80N_80MPP_ADJ (pendiente 80 m) y LPSR_80N_20MPP_ADJ (máscara binaria 20 m). Marco ME/DE421, esfera R=1737400 m, estereográfica norte. Archivos/hashes y unidades en config/terrain-sources.json y terrain/catalog.json; originales fuera de Git.
- NASA [PGDA 90](https://pgda.gsfc.nasa.gov/products/90): se añade LPSR_80S_20MPP_ADJ, máscara binaria PSR 20 m (1 PSR / 0 no PSR / NaN sin cobertura). Lectura de píxeles nativos; no usar overviews promediados para clasificación. Producto cuantitativo aproximado y cobertura 80–90° de ambos polos, con límites en ephemeris-integration.md.
- Nayuki, [QR Code generator library](https://www.nayuki.io/page/qr-code-generator-library), [JavaScript original](https://www.nayuki.io/res/qr-code-generator-library/qrcodegen.js), licencia MIT preservada en web/public/vendor/qrcodegen.js. SHA-256 original descargado: 2511bc17f40a3c41d4a0578995db956b38997334d3d20113a5d4dc5c49c69480. Solo formato y adaptador local añadidos; no es una imagen generada por IA ni se llama a un servicio QR externo.
- Efemérides de Javi: kernels NAIF y vectores ya citados en este registro; realización MOON_ME_DE440_ME421 y comparación oficial en docs/validation/horizons-check.md. No se aplica una rotación ME/PA inventada ni un offset Cesium/LOLA supuesto.

## 2026-11-15 — astronauta y presentación de Street View

- Astronauta PNG con transparencia generado con OpenAI imagegen por petición de Pablo; marca AI visible, sin insignias ni banderas. Fuente/origen y SHA256 en web/public/streetview/assets.json. Ilustración de interfaz, no dato NASA ni fotografía.
- Cesium: https://cesium.com/learn/ion/cesium-ion-access-tokens/ clasifica assets:read como scope público para clientes. Pablo autorizó ahora versionar su token de aplicación limitado a Moon2684829 y orígenes locales para evitar configuración individual. Variable VITE_CESIUM_ION_TOKEN como override. Scopes privados siguen fuera del repositorio; no se amplían restricciones ni se modifican escáneres.
- Cesium: https://cesium.com/learn/ion/content-usage-and-attribution-guide/ exige logo ion visible y crédito de datos. Se conservan en el visor. Documentación de detalle/normal: https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html y https://cesium.com/learn/cesiumjs/ref-doc/CustomShader.html. Los cambios son de representación; no añaden precisión al DEM científico.
- (javiseirulo, 2026-11-15) Capa web `psr` de `layers.json`: NASA PGDA 90, [LPSR_80S_20MPP_ADJ.TIF](https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LPSR_80S_20MPP_ADJ.TIF) (Barker et al. 2023), SHA-256 ad95311b81db773039af441dd66a017f024327858c6e0314b8c92bf2f470834e (coincide con delivery.json de Pablo), leída a resolución nativa y reducida a 512² por mayoría (≥50 % de celdas PSR) en python/export/layers.py. Elevación/pendiente: PNG de Pablo (LDEM/LDSM_80S_80MPP_ADJ). Luz/Tierra: rejillas propias (SPICE, ya citadas).
| 2026-11-15 | @javocruz | Textura de la Luna de la intro (`web/public/landing/moon-2k.jpg`): reducción a 2048×1024 de `lroc_color_poles_4k.tif` del CGI Moon Kit, NASA Scientific Visualization Studio — https://svs.gsfc.nasa.gov/4720 (ya registrada arriba para el globo) | Se dibuja como esfera en un canvas (`web/src/intro/moonSphere.ts`); atribución visible en el pie de la intro |
| 2026-11-15 | @javocruz | Fuentes **Inter** y **DM Mono** (SIL Open Font License 1.1) vía paquetes `@fontsource`; son las que usa nasa.gov (Inter para texto, DM Mono Light para cifras) | Solo en la página de intro. Añadir a *References* |
| 2026-11-15 | @javocruz | `web/public/landing/mist.png`: niebla generada por script propio (`web/scripts/gen-landing-mist.mjs`), arte original sin imágenes externas | Sin licencia que citar |
| 2026-11-15 | @Manuelcgg165 | Kernels SPICE NAIF (`naif0012.tls`, `pck00011.tpc`, `de440s.bsp`, `moon_pa_de440_200625.bpc`, `moon_de440_250416.tf`) — https://naif.jpl.nasa.gov/pub/naif/generic_kernels/ (mismos que el pipeline) | Sol y Tierra en la fecha real de cada aterrizaje histórico (`python/export/historic.py`) y años 1966–2025 en `web/public/data/ephem/` |
| 2026-11-15 | @Manuelcgg165 | Coordenadas de los sitios de aterrizaje: NSSDC https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html ; candidatos Apollo ALS-1..5: NASA "50 Years Ago: Lunar Landing Sites Selected" https://www.nasa.gov/feature/50-years-ago-lunar-landing-sites-selected ; finalistas Apollo 15–17: NASA SP-4214 cap. 12 https://www.nasa.gov/wp-content/uploads/static/history/SP-4214/ch12-5.html ; Luna 25 (Boguslawsky, Manzinus, Pentland A) vía Global Security https://www.globalsecurity.org/space/world/russia/luna-25.htm ; Chandrayaan-2 sitio de reserva vía Space.com https://space.com/india-chandrayaan-2-moon-south-pole-landing-site.html ; Chandrayaan-3 ALS (PRL) https://arxiv.org/abs/2308.10712 ; resto de alternativas: nomenclátor IAU/USGS (`web/public/data/terrain/lunar-names.json`) | Modo Historical de Mission (`python/export/historic_missions.yaml`, fuente por misión). Añadir a *References* |
