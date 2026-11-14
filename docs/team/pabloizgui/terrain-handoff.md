# Entrega de terreno para Marta, Javi y Javi2 (#37)

2026-11-14 · Pablo · implementación asistida por OpenAI Codex.
Contrato **propuesto**, pendiente de revisión por Marta/Javi2 antes de integrar
en `dev`. No modifica el globo, loaders, store ni catálogo principal de mocks.
Seguimiento completo: [tasks.md](tasks.md).

## Archivos y destinatarios

Actualizado tras integrar `origin/dev` en `461507a` (Javi, J0/J10).
El nuevo ZIP es `data/exports/lunar-terrain-team-v2.zip`; se conserva el v1.
Los binarios de altura/máscara y las capas previas no cambian.
Se añaden `terrain/processing.json` (5 m, azimut 0,1°/1°, base 300 km) y
`terrain/delivery.json` (archivos listos, hashes y dependencias pendientes).
Detalle: [javi-context-sync.md](javi-context-sync.md).

La carpeta generada es `web/public/data/terrain/`. El paquete ZIP de entrega en
`data/exports/` incluye esa carpeta y los GeoTIFF de comprobación opcionales
en `verification/`. Estos se conservan localmente en
`data/exports/lunar-terrain-gis-v1/`, fuera del directorio público de la web.
Para usar el ZIP, copiar **solo `terrain/`** dentro de `web/public/data/` de la
app existente. No sustituir su `layers.json` principal; revisar la integración
de las dos capas con Marta/Javi2. La figura `preview.png` es una comprobación
visual de los datos; el heightmap utilizable es el binario Float32.

| Destinatario | Archivos | Uso |
|---|---|---|
| Marta | `heightmap.json`, `heights.f32`, `valid.u8` | Malla polar real: 1025×1025, Float32 LE en metros, máscara 0/1 |
| Marta / Javi2 | `layers.json`, `elevation.png`, `slope.png` | Dos capas reales compatibles con `LayersManifest`; 512×512 gris8 + alfa, para pintar |
| Javi | `site-terrain.json`, `site-terrain.csv` | Altura y pendiente del píxel nativo de 80 m en las coordenadas de los 20 sitios del fixture |
| Todo el equipo | `provenance.json` | Fuente, citas, tamaño, hash local, frame, metadatos y límites de uso |
| Validación GIS | `heightmap.tif`, `elevation.tif`, `slope.tif` | Georreferenciación y alturas/pendientes sin cuantización gray8; no hacen falta en la web |

**La tabla de sitios conserva `input_sites_mock: true`:** los valores de terreno
son reales, pero los nombres/coordenadas proceden de los fixtures del equipo.
No acredita que sean puntos oficiales de aterrizaje ni sustituye `valid`, score,
PSR, iluminación o series temporales de Javi. El muestreo es del píxel nativo
más cercano, no una media de la malla visual.

## Geometría y decodificación para Marta

- Proyección exacta de `layers.json`: estereográfica polar sur, meridiano 0°,
  esfera de radio 1 737 400 m. Frame de los datos: **MOON_ME de DE421**.
- `bounds_m = [-304006, -304006, 304006, 304006]` en orden
  `[min_x, min_y, max_x, max_y]`. No estirar el DEM original de ±304000 m para
  fingir ese límite: remuestreo sobre la ventana compartida y NoData conservado.
- Heightmap: **1025 vértices**, **1024 intervalos**, paso **593.76171875 m**.
  Vértice `(row=0, col=0)` en `(-304006, 304006)`; X aumenta a la derecha,
  Y disminuye al avanzar de fila. Índice lineal `row * width_px + col`.
- `x = min_x + col * (max_x-min_x)/(width_px-1)`;
  `y = max_y - row * (max_y-min_y)/(height_px-1)`.
- Cada altura son 4 bytes IEEE-754 **little-endian**, en metros. Escala 1,
  offset 0. Elevación según la esfera de referencia LOLA de 1 737 400 m;
  no altura absoluta desde el centro de la Luna ni offset calibrado con Cesium.
- Cada máscara es 1 byte: **1 válido, 0 NoData**. Los valores inválidos son
  también `NaN`. No elevarlos a cero. Omitir triángulos con vértices inválidos.
- Recorte circular hasta −80°S: las esquinas del cuadrado quedan sin terreno.
  La máscara también conserva los huecos/bordes de la fuente.
- Los PNG de capas son texturas con muestras en **centros de píxel**, no
  vértices. UV: `u=(x-min_x)/(max_x-min_x)`, `v=(max_y-y)/(max_y-min_y)`;
  conservar el convenio actual del loader para el `flipY` de three.js.
- La malla debe mantener la curvatura lunar que describe el bloque de Marta;
  no interpretar X/Y proyectados como una superficie plana sobre toda la región.
  Una exageración visual de altura no debe afectar cálculos ni sombras científicas.

Ejemplo mínimo de lectura (sin cambiar el loader de Marta):

```ts
import type { PolarHeightmap } from '@lunar/contracts';

const fetchOk = async (path: string) => {
  const response = await fetch(`/data/${path}`);
  if (!response.ok) throw new Error(`Terrain request failed: ${response.status}`);
  return response;
};
const meta: PolarHeightmap = await (await fetchOk('terrain/heightmap.json')).json();
const [heightResponse, maskResponse] = await Promise.all([
  fetchOk(meta.heights.file), fetchOk(meta.mask.file),
]);
const [heightBytes, maskBytes] = await Promise.all([
  heightResponse.arrayBuffer(), maskResponse.arrayBuffer(),
]);
const count = meta.width_px * meta.height_px;
if (heightBytes.byteLength !== count * 4 || maskBytes.byteLength !== count) {
  throw new Error('Invalid terrain payload length');
}
const heights = new DataView(heightBytes);
const mask = new Uint8Array(maskBytes);
const heightAt = (row: number, col: number): number | null => {
  if (row < 0 || row >= meta.height_px || col < 0 || col >= meta.width_px) return null;
  const index = row * meta.width_px + col;
  const value = heights.getFloat32(index * 4, true);
  return mask[index] === 1 && Number.isFinite(value) ? value : null;
};
```

El `DataView` declara el endianness sin asumir el del dispositivo. No decodificar
este heightmap mediante canvas/PNG: la capa `elevation.png` solo es para color.
Para producción se deben validar el JSON contra el contrato y los hashes del
payload; el ejemplo muestra únicamente la lectura binaria.

## Capas para Javi2 y límites científicos

`terrain/layers.json` solo contiene elevación y pendiente reales, con `mock:false`.
No reemplaza `data/layers.json`: este sigue incluyendo iluminación/PSR/score mock.
Integración propuesta: revisar y sustituir **solo esas dos definiciones** por PR;
mantener visible que el conjunto de datos de la app sigue siendo parcialmente mock.
Los caminos de archivo son relativos a `/data/`, como exige `LayerDef.file`.

Los PNG son gris8 + alfa. Valor = `min + gray/255*(max-min)`; alfa 0 = NoData.
Se remuestrean con media por área a 512×512. La pendiente viene del **LDSM de
NASA**, no de derivar alturas de la malla de unos 594 m. Estos promedios de
visualización no son pendientes máximas ni criterios de seguridad de un módulo
de aterrizaje. Javi debe fijar la escala/huella de sus métricas científicas.

80 m es espaciado del producto original, no su precisión ni resolución efectiva
uniforme. La malla remuestreada tampoco conserva detalle de 80 m. No se incluyen
sombras, PSR, efemérides, horizontes ni resultados de idoneidad inventados.

El DEM fino de 5 m sigue separado para detalle local. Los horizontes (#38) deben
combinar detalle cercano y relieve lejano, curvatura y validación de convergencia.
DE421 y los kernels DE440 de Javi requieren revisar la transformación de frame;
no basta con cambiar la etiqueta del archivo. La alineación vertical con Cesium
es otra validación pendiente.

## Regeneración

Python 3.10+ con `pip install -r requirements-terrain.txt`. En este ordenador,
el entorno operativo está en `%LOCALAPPDATA%/Temp/lunar-terrain-venv`; la ruta
larga de OneDrive impidió instalar el entorno dentro del repositorio.

```powershell
python scripts/terrain_data.py download --source lola-south-pole-80m
python scripts/terrain_data.py download --source lola-south-pole-slope-80m
python scripts/terrain_data.py inspect --source lola-south-pole-80m
python scripts/terrain_data.py inspect --source lola-south-pole-slope-80m
python python/terrain/export_polar.py data/terrain/lola-south-pole-80m/LDEM_80S_80MPP_ADJ.TIF data/terrain/lola-south-pole-slope-80m/LDSM_80S_80MPP_ADJ.TIF web/public/data/terrain --verification-output data/exports/lunar-terrain-gis-v1
python -m unittest discover -s tests -v
python python/terrain/prepare_handoff.py
node scripts/check-terrain-delivery.mjs
```

El exportador rechaza fuentes incompletas, tamaño distinto del catálogo,
cantidades/frame incompatibles y proyección distinta; no sobrescribe entregas.
`heightmap.json` se escribe al final como marcador de entrega completa.
La equivalencia `k=1` / `lat_ts=-90` se normaliza explícitamente: GeoTIFF/GDAL
puede representar de ambas formas la misma proyección polar sur.
Los hashes locales permiten comprobar integridad; no son checksums del editor.
`.gitattributes` conserva los bytes de `web/public/data/terrain/**` sin
normalizar saltos de línea: convertir CSV/JSON entre CRLF y LF invalidaría
los hashes al compartir la entrega entre Windows y Linux.
El comprobador JS lee **todas** las muestras como `DataView` little-endian y
verifica tamaños, hashes, correspondencia máscara/NaN, rango, recorte polar,
alineación con `layers.json` y codificación PNG. Una prueba corrompe un byte
del fixture y exige que falle. El workflow `terrain.yml` ejecuta estas pruebas
sin descargar los DEM grandes; todavía no se ha ejecutado en GitHub.

## Fuentes y registro

- [NASA GSFC PGDA 90](https://pgda.gsfc.nasa.gov/products/90):
  `LDEM_80S_80MPP_ADJ.TIF` y `LDSM_80S_80MPP_ADJ.TIF`.
- Barker et al. (2023), *A New View of the Lunar South Pole from the Lunar
  Orbiter Laser Altimeter*, PSJ 4, 183.
  [DOI artículo](https://doi.org/10.3847/PSJ/acf3e1),
  [DOI datos](https://doi.org/10.60903/gsfcpgda-lola-spole).
- [Convención de esfera de referencia LOLA, NASA PGDA](https://pgda.gsfc.nasa.gov/products/95).
- Referencias y uso de IA registrados en `docs/04-resources-data.md` y
  `docs/si-usage-log.md`. La topografía procede de mediciones/productos NASA;
  la IA ha asistido en el código de transformación y la documentación.

## Comprobación de esta entrega

- Fuentes completas, longitud esperada, cabecera TIFF y SHA-256 local. GeoTIFF
  7600×7600, Float32, 80 m, NoData NaN, escala 1 y offset 0, CRS lunar esperado.
- Heightmap real: **1 050 625 muestras, 823 469 válidas**, rango remuestreado
  **−6665,0498 a 7005,4214 m**. Float32: 4 202 500 bytes; máscara: 1 050 625 bytes.
- 20/20 sitios del fixture tienen elevación/pendiente nativas válidas.
- Pruebas: **19 Python**, **13 web**; comprobación de tipos, lint y build pasan
  mediante los ejecutables nativos instalados. Comprobador JS del payload real:
  tamaños, hashes, geometría, máscara/NaN, rango y PNG correctos.
- El wrapper `gstack-checks` devuelve exit 127 al lanzar los comandos bajo este
  entorno Windows; no se declara `READY_FOR_SHIP`. Las verificaciones nativas
  anteriores son comprobaciones independientes; CI remoto aún no ejecutado.
- Inspección visual del mapa de alturas/pendientes. No equivale a validar
  científicamente la totalidad del DEM ni a aprobar el terreno para aterrizaje.
- Como control puntual del siguiente trabajo, a −89,9°, 0° el muestreo nativo
  da 628,64 m en PGDA 81 (5 m) y 648,12 m en PGDA 90 (80 m). No son la misma
  escala/soporte; no inferir un offset constante de esa diferencia ni de Cesium.
