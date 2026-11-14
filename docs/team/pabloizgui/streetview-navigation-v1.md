# Street View: navegación, lectura del relieve y horizontes de prueba

2026-11-14 · Pablo · implementación asistida por OpenAI Codex.
Origen humano: peticiones de Pablo en el chat del Street View. Alcance: #46 y
benchmark de #38; conserva la entrega de Marta y el reloj/selección de core.

## Decisiones de implementación

- Arrastre izquierdo / un dedo para mirar, rueda / pinza para campo de visión.
  Un clic o toque sin arrastrar permite caminar a terreno visible cercano;
  máximo 200 m por paso. Sin botones de flechas. Teclado conservado.
- La cámara permanece sobre la malla Cesium. Transición interpolada con altura
  muestreada a lo largo de la ruta, sin usar la esfera lisa como suelo.
- Cielo negro lunar siempre. Modo de lectura con iluminación artificial y tinte
  discreto de sombra/noche; no constituye una simulación fotométrica ni calcula
  visibilidad. Se identifican los datos mock y la falta de efemérides.
- Coordenadas libres en el módulo como puente hasta `selectedPoint` de Javi2.
  Al alejarse del sitio se invalidan sus series: nunca trasladar su Sol/Tierra.
- Rótulos desde Gazetteer IAU/USGS: líneas finas con codo, pocos a la vez,
  distancia acotada y anclaje al relieve. Nombres designan centros de accidentes,
  no cumbres medidas. No cambiar el catálogo de candidatos del equipo.
- Cesium Moon es global. DEM independiente LOLA global LDEM_64 (473,802 m en
  ecuador) como cobertura de prueba; los DEM polares 5/80/240 m siguen teniendo
  prioridad. Un DEM global grueso no acredita resolución de detalle en todas partes.
- Horizonte: esfera R=1 737 400 m, observador 5 m, azimut desde norte local,
  `atan2((R+z)*cos(d/R)-(R+z0+h), (R+z)*sin(d/R))`.
  Prototipo separado de productos de producción; medir convergencia espacial y
  alcance. No convertir NoData en cero ni calcular a partir del heightmap visual.

## Dependencias externas

| Equipo | Entrega o acuerdo pendiente |
| --- | --- |
| Javi | `@/ephem`, vectores e índice 2026–2055, realización MOON_ME DE421/DE440 y catálogo #48 con coordenadas respaldadas. Confirmar contrato de horizonte del PR #70 y comparar el prototipo antes de publicarlo como producción. |
| Javi2 | `selectedPoint` y navegación del punto global, dominio de despliegue para el token Cesium y revisión de contratos/loader. El reloj continúa siendo `currentTimeUTC`. |
| Marta | Revisar heightmap Float32/máscara y alineación con el globo; acordar resolución/coste de las teselas solicitadas (72 azimuts frente a J0). Sus pins locales todavía no viajan al visor. |
| Cristóbal | Escenarios y salto sitio/fecha mediante core. Los horizontes experimentales no alimentan un veredicto de misión. |

## Estado de partida y verificación

Base `93fcc4a`: integra dev `0e00fc3`, globo v0 y alcance global. Se preservan
las notas locales y el trabajo de imágenes #74. El intento de herramienta de
worktree no respondió; al terminar la otra tarea, el checkout volvió a #46.
Una copia temporal de desarrollo se creó fuera del repo, sin commits adicionales.

gstack disponible para Codex; `verify` no puede detectar checks porque su
wrapper no encuentra `bun` en PATH (exit 127). Se registra como límite del
entorno; las comprobaciones nativas declaradas y la verificación visual se
reportarán por separado, sin atribuir un gate verde a gstack.

## Productos calculados y límites

- `web/public/data/terrain/trials/`: seis perfiles, CSV del piloto más denso y
  `benchmark.json`; guía de lectura/reproducción en su `README.md`.
- Piloto sur (fixture −89,9°, 0°): 3600 direcciones a 0,1°, observador 5 m,
  alcance 310 km y mezcla de DEM 5/80/240 m; 3600 rayos completos sin fallback
  global. Altura bilineal del suelo 627,94075 m en el DEM, distinta de la malla
  Cesium. No se aplica un offset entre fuentes.
- Refinamiento radial 1×→2×: máximo 0,06314° y un azimut >0,05°; 2×→4×:
  máximo 0,03768° y ninguno >0,05°. De 150 a 310 km hay un cambio máximo de
  0,35741°; 200, 300 y 310 km coinciden solo en este punto. Falta convergencia
  angular, evaluación de errores/solapes y contraste independiente.
- Runtimes medidos: 1,963 s a 1°; 7,445/14,173/73,649 s a 0,1° con 1×/2×/4×.
  El último coincidió con carga de navegador/build: no extrapolar como garantía
  de tiempo del lote. Ecuador y norte gruesos: 0,994 y 1,220 s a 1°.
- Se mantienen **0 perfiles de producción** en `delivery.json`. El loader de
  Javi no consume estos experimentos. Para los completos se conservan los
  nombres del esquema propuesto (`elev_deg`, `max_range_km`, `source`, etc.);
  un perfil con huecos lleva `null` y no puede pasar a producción sin resolverlos.
- DEM global en `data/terrain/lola-global-64ppd/ldem_64.img`, ignorado por Git;
  SHA-256 `1c4958699d4cffd7e777d51421b6044bba300aa0bef286a544309efb082cdbd6`.
  Verificación de longitud, etiqueta y rango completo de DN (−18229..21514).
  `OFFSET=1737400` convierte a radio, no se añade a la elevación `DN×0,5`.
- `lunar-names.json`: 2023 accidentes aprobados por IAU, sin cráteres satélite
  con letras, cada uno con enlace individual y SHA del KMZ fuente. Centros
  planetocéntricos de control LOLA 2011; no son posiciones medidas de cumbres.

## Detalles de navegación que conviene conservar

- El círculo usa el punto del depth buffer y solo admite pasos de 1–200 m.
  La trayectoria geodésica se muestrea cada ≤5 m, se interpola durante 1 s y
  respeta `prefers-reduced-motion`. Un salto global exige enviar coordenadas.
- Muestrear con una semilla cartográfica a 30 km evita el origen del rayo de
  9 km que Cesium usa por defecto para terreno terrestre; no modifica el datum
  ni la altura devuelta. Es necesario para las cumbres lunares más altas.
- El LOD visible puede quedar temporalmente por encima de la malla más fina.
  El visor sigue el mayor suelo visual disponible para evitar que el ojo entre
  en triángulos durante el refinamiento; no cambia el DEM ni el horizonte.
- La lectura del relieve deriva normales de la geometría en el shader: algunas
  teselas carecen de normales utilizables. Se conserva el cielo negro y la
  atribución de Cesium. El aspecto facetado procede de la geometría disponible;
  no se añaden rocas ni detalle sintético presentado como relieve real.
- El token sigue únicamente en `.env.local`, ignorado; no se publica ni se
  modifica el escáner. En un teléfono físico el origen LAN/HTTPS debe estar
  permitido por el token de desarrollo antes de poder cargar Cesium.

## Comprobaciones del bloque v1

Pruebas nativas declaradas: 31 Python y 62 web pasan; tipos, ESLint y build
pasan. El build conserva la advertencia de tamaño del chunk Cesium (unos 4,99 MB,
1,39 MB gzip), cargado de forma diferida. Verificación de entrega de Marta:
hashes, Float32 LE, máscara, límites y PNG correctos, sin regenerar su malla.
El wrapper gstack no queda verde: detección falló por `bun` ausente en PATH;
no se alteró su configuración para evitarlo. Telemetría desactivada y preferencia
de no añadir routing a CLAUDE.md respetada.

Navegador gstack propio, Cesium real con `.env.local`: arrastre táctil cambia
rumbo, pinza 1,5× reduce FOV de 65° a 43° sin desplazar la ubicación; toque a
terreno próximo cambia la ubicación y oculta las series previas. Un salto
explícito a −85,5°, 33,8° termina correctamente; vista ampliada ocupa 390×664
en móvil emulado. Se mantienen pendientes dispositivo físico, artefactos de
refinamiento LOD en toda la superficie y comparación visual/Cesium-DEM.

Fuentes y binarios crudos grandes permanecen ignorados. No hay token en el
código ni ampliación de privilegios. El bloque v1 no está publicado aún ni
mergeado a dev; se preparará commit local con los archivos propios solamente.

### Prueba física desde un teléfono (pendiente)

El token actual autoriza localhost/127.0.0.1:5173. Para probar un teléfono físico,
Pablo debe añadir al token de desarrollo el origen LAN exacto del ordenador
(o un origen HTTPS de prueba); no ampliar scopes ni assets. Después se puede
arrancar explícitamente `pnpm --filter web dev --host 0.0.0.0` y abrir desde el
móvil ese origen en la misma red. El servidor normal sigue ligado a 127.0.0.1.
No hacen falta cuentas Cesium por alumno/compañero; sí un token de aplicación
restringido al dominio de despliegue cuando se publique la aplicación.

La última repetición de Vitest mientras corría Vite encontró un bloqueo de
watcher EBUSY en una textura de Cesium dentro de OneDrive; no falló una aserción.
Se repetirá con el servidor de desarrollo detenido, sin excluir pruebas ni
cambiar la configuración del comprobador.

Rótulo verificado en la escena real: Mons Pico desde 45,818°N, −8,87°E,
mirando ligeramente hacia abajo para dejar espacio al líder. El centro a unos
64 m queda visible; su equivalente a 6,7 km se oculta correctamente tras relieve
próximo. Se comprobó el SVG con texto y línea. Se corrigió también la actualización
final de etiquetas/rumbo/FOV en `requestRenderMode`: el throttle agenda un último
frame en vez de perder una actualización cuando la escena queda quieta.
El diagnóstico temporal se retiró del código final.

Prueba global adicional: salto correcto a 5,4°N, −158,6°E (cara oculta),
con suelo visual a 13 300,5 m. Esto comprueba el caso que supera el origen
terrestre de 9 km del muestreo original. Giro hasta 90° en ese punto,
sin error del renderer. Los datos de Sol/Tierra quedan desconocidos en ese punto.

Cierre de comprobaciones: con Vite detenido, la repetición final pasa 62/62
pruebas web, tipos, ESLint y build. Python pasa 31/31; entrega de Marta verificada.
Formato del árbol candidato de Git comprobado con LF: correcto. Inspección
exacta de los 206 archivos del candidato: el token local no aparece. Se vuelve
a arrancar Vite en 127.0.0.1:5173 para revisión de Pablo. No se publica el bloque.
