# Ajuste de Pablo al contexto de Javi — 2026-11-14

Base integrada: `origin/dev` en `461507a` (PR #64). Se conserva el commit de
datos `958b1a4` y el visor en su rama #46. El PR #66 de Design/Mission sigue
abierto: se ha leído, pero no se incorpora una rama ajena pendiente de revisión.

## Decisiones y configuración ejecutable

`config/terrain-processing.json` es la configuración de producción de Pablo.
`prepare_handoff.py` la valida y la entrega como `terrain/processing.json` junto
con `terrain/delivery.json`. Son metadatos de entrega, no perfiles calculados.

| Tema | Configuración actual | Estado de entrega |
|---|---|---|
| Altura del observador | 5 m sobre terreno, según J0 #4 | Valor científico común; no sumar 5 m al heightmap de Marta |
| Azimut en sitios curados | 0,1°, 3600 muestras, 0…359,9° | Norte lunar local, horario; no repetir 360° |
| Azimut en mapa de calor | 1°, 360 muestras, celdas de 5 km | Segunda prioridad; no hay horizontes de celdas calculados |
| Alcance inicial | 300 km de distancia sobre la esfera lunar | Propuesta de Pablo; requiere benchmark y convergencia |
| Validación de alcance | Comparar 150, 200, 300 y 310 km; objetivo operativo 0,05° | No es una garantía de exactitud del DEM ni un resultado ya validado |
| Cobertura de producto | La lista la define #48 | Meta inicial de capacidad: hasta 20 perfiles, condicionada al benchmark; hoy 0 perfiles listos |
| Cobertura de terreno entregada | Parche 80–90°S; datos de 20 coordenadas de fixtures | No equivale a 20 sitios curados ni a cobertura de rayos validada |
| Cielo y tiempo | `@/ephem` de Javi, anual 2026–2055, horario | Contrato y datos reales todavía pendientes en `dev` |

## Relieve lejano y resolución

Plan inicial de fuentes anidadas, escogiendo la mejor fuente disponible y
registrando los cambios de resolución por sitio/azimut:

1. 0–5 km: DEM 5 m PGDA 81 donde tenga cobertura; respaldo PGDA 90 de 80 m.
2. 5–80 km: PGDA 90 de 80 m; respaldo de 240 m si se sale del producto polar.
3. 80–310 km: `LDEM_60S_240MPP_ADJ.TIF` de PGDA 90, hasta −60°S.

El último producto permite salir del parche visual para los sitios cercanos a
−80°S. Los límites de Marta siguen intactos. La disponibilidad del archivo,
su extensión y su máscara no prueban que todos los rayos estén completos.
No se usa la malla reducida de ~594 m para producir el horizonte científico.
5 m de altura del observador tampoco significa 5 m de resolución en todos los sitios.

Se calcula la elevación mediante geometría esférica en el sistema local del
observador; `d²/(2R)` sirve de comprobación, sin sumar de nuevo esa curvatura.
La distancia es superficial, no una línea recta en el mapa estereográfico.
La comparación entre radios, pasos radiales y resolución de fuentes debe
preceder a la publicación. Validar también las zonas de solape PGDA 81/90.
El muestreo angular de 0,1° es una rejilla de salida, no una precisión garantizada.

Justificación del enfoque: [Barker et al. (2023)](https://doi.org/10.3847/PSJ/acf3e1)
emplean mapas anidados hasta 310 km. Aquí se adopta una base de 300 km y se
reserva 310 km para comprobar convergencia; no se afirma haber reproducido sus resultados.
[Fuente y archivos NASA](https://pgda.gsfc.nasa.gov/products/90).

## Cobertura y perfiles que necesita Javi

Destino acordado: `horizon/<id>.json`, con los campos de J10:
`version`, `site_id`, `lat`, `lon`, `observer_height_m`, `az_step_deg`,
`elev_deg`, `max_range_km`, `source` (producto, versión y método).
El contrato definitivo de horizonte v1.1 lo revisamos con Javi; no se publica
un segundo esquema incompatible mientras llega su PR.

Un perfil se entrega como completo solo si todos los sectores están cubiertos
y validados. Si faltan datos, se registra el problema como desconocido y se
omite de la lista de perfiles utilizables: **no rellenar con 0°** ni escribir
`elev_deg` vacíos o inventados como perfiles reales. Una extensión con máscara
o valores nulos requiere revisión del consumidor de Javi.

La entrega diferencia cuatro coberturas: malla visual, fuente numérica,
perfiles científicos calculados y tiempo disponible de efemérides. Hoy hay
topografía real para Marta y una tabla de 20 fixtures; no hay perfiles científicos.
El primer benchmark de #38 se hará sobre un punto técnico antes de lanzar el
lote aprobado en #48. El mapa de calor completo no bloquea esta entrega.

## Vectores Sol/Tierra y Street View

- Javi produce `ephem/index.json` y `ephem/<YYYY>.bin`; Pablo los consume.
  Cada hora: seis Float32 LE, primero dirección unitaria Sol XYZ y después
  posición Tierra XYZ **en km respecto al centro lunar**. No normalizar ni
  convertir la posición terrestre en dirección antes de restar la del observador.
- `@/ephem.skyAt(lat, lon, t)` transforma al punto solicitado con paralaje
  terrestre. `buildTimeseries` conserva la interfaz `Timeseries` para la web.
  Respetar el store/reloj de Javi2 y la fecha de llegada que defina MissionConfig.
- Confirmar la realización del marco en el índice: el DEM es MOON_ME/DE421 y
  Javi prevé kernels DE440. `MOON_ME` sin realización no permite asumir igualdad.
  Alinear explícitamente antes de combinar posiciones, terreno y visibilidad real.
- Sin perfil del punto: cielo geométrico con etiqueta **"no terrain"**; no
  transferir el perfil o la serie de otro sitio ni deducir `lit` del render.
- Hasta que exista `@/ephem`, el visor conserva el adaptador de series del
  **mismo** sitio y dentro de su ventana. Los mocks de 2027 no se amplían a 30 años.
- La altura visual podrá cambiar, pero no recalcula por sí misma la visibilidad
  precalculada a 5 m. El valor inicial de cámara debe coincidir en 5 m; sigue
  pendiente la prueba de cámara 360° y la alineación vertical con Cesium.

## Entrega preparada

- `terrain/heightmap.json` + Float32/máscara: iguales a la entrega anterior.
- Capas reales y tabla de sitios: conservadas, separadas de los mocks generales.
- `terrain/processing.json`: parámetros definidos para Javi/Pablo.
- `terrain/delivery.json`: inventario con hashes, disponibilidad de fuentes y
  estados explícitos de horizonte/efemérides pendientes.
- ZIP v2 y borrador de PR con base `dev`, referencias #37/#38/#48 y revisión
  solicitada a Marta/Javi/Javi2. Preparar no implica publicar ni enviar mensajes.

## Preservación de trabajo

Antes de integrar se crearon `backup/pablo-terrain-before-javi-20261114` y
`backup/pablo-streetview-before-javi-20261114`. Las siete notas/cambios locales
sin commit se guardaron en el stash `c04ac6210f0768787660f8ede496aefa8a5e6108`
para restaurarlos al finalizar. No se reescribieron commits ni se borraron stashes,
datos brutos o credenciales. El conflicto append-only de `si-usage-log.md` se
resolvió conservando ambas entradas. Merge de contexto: `692dc65`.
