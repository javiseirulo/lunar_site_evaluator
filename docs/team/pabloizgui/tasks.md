# Pablo: progreso y pendientes

## Estado vigente — 2026-11-15

Rama `pabloizgui/46-globe-streetview`, desde dev `0ca606d`, con #91, #97, #98, #90 y #101 integrados.
Guías actuales: [globe-surface-integration.md](globe-surface-integration.md) y
[ephemeris-integration.md](ephemeris-integration.md). Sustituye estados históricos.

Añadido: astronauta PNG arrastrable en el globo existente, retorno al mapa 3D,
Sol/Tierra, guardado por click derecho/doble toque en el formato de Marta,
nombres más tolerantes y mayor detalle de render. La clave pública de desarrollo
queda en código por solicitud expresa de Pablo; variable de entorno opcional.
No se duplica la transición ni el acceso desde ficha que el usuario confirmó existentes.


| Tarea de Pablo | Entrega |
|---|---|
| Heightmap/capas para Marta | `terrain/heightmap.json`, `heights.f32`, `valid.u8`, `layers.json`: bytes/hashes originales conservados; malla 1025², fuente 80 m, ventana hasta 80°S |
| Relieve de los 59 sitios reales | `terrain/catalog.json` y `catalog-terrain.csv`: elevación, pendiente, fuente, precisión y PSR; los 20 puntos fixture de `site-terrain.*` son históricos |
| Horizontes de los 41 sitios polares | `horizon/<id>.json`, 5 m, 0,1°/3600 azimuts, 310 km, curvatura, cobertura y refinamiento radial/angular; resultados en `catalog-delivery.json` |
| Norte / PSR | DEM norte 80/240 m, pendiente norte 80 m y máscaras binarias PSR norte/sur 20 m. Distancias aproximadas, cota espacial 190 m; null fuera de cobertura demostrable |
| Cielo real | `@/ephem` de Javi, 2026–2055, paralaje terrestre y marco ME_DE440_ME421; sin series mock en Street View |
| Navegación global y móvil | Arrastre izquierdo/un dedo, rueda/pinza, sin flechas; pasos hasta 200 m, transición suave, coordenadas libres y teclado |
| Lectura del relieve / nombres | Luz artificial, estado solar explícito, cielo negro, rótulos IAU/USGS con línea oblicua/horizontal; centros de accidentes, no cumbres |
| Reloj y enseñanza | UTC completo, pasos y reproducción sobre el reloj de core; enlace/QR con posición, cámara, altura y tiempo, sin token |
| Validación y publicación | Comprobaciones nativas autorizadas y navegador; QR renderizado decodificado por ZXing y móvil emulado; publicación autorizada, sin merge automático. Teléfono físico pendiente; no se afirma un flujo automático gstack completo |

### Qué queda del resto del equipo

- **Javi:** el PR #101 ya incorpora los 41 horizontes y elevación/pendiente/PSR
  al export y usa 10° de pendiente máxima. `psr_dist_km` sigue pendiente en 18
  sitios sin cobertura. Las rejillas científicas globales/polares siguen siendo
  geométricas; no equivalen a una oclusión de relieve calculada por celda.
- **Marta:** su globo ya consume heights/máscara y, con #101, capas reales;
  revisar astronauta, pins compartidos y rendimiento del parche. Entrada por
  coordenadas/UTC y retorno al punto observado implementados en esta rama.
- **Javi (core/capas):** #101 ya publica `layers.json` real y lo pinta en esfera
  y parche; su actualización Normal/Expert y barra lateral se conservan.
  Coordinar cualquier ajuste futuro del Mission Clock; Street View ya tiene UTC.
- **Javi2 / despliegue:** configurar un token/origen permitido para el despliegue
  público de Vercel; el desarrollo local ya usa la clave compartida del código.
- **Pablo / despliegue:** permitir el dominio definitivo en el token de lectura y
  probar teléfono físico. Un QR localhost no abre el ordenador del profesor desde
  otro teléfono; no hace falta otra cuenta Cesium para cada compañero.
- **Cristóbal:** comprobar Mission → sitio/fecha → visor usando el store compartido.

### Próxima revisión gráfica

Pulido con Pablo, teléfono físico, calibración Cesium/LOLA con varios puntos y
costuras temporales de LOD. No se aplica un offset vertical supuesto. Los perfiles
son estimaciones muestreadas, no certificación de aterrizaje ni resolución 5 m global.
Fuera de los puntos/altura calculados se etiqueta el horizonte geométrico y la
altitud de referencia para paralaje. Estrellas/constelaciones quedan como mejora
didáctica posterior, con catálogo y orientación verificados.

## Historial anterior (no representa el estado vigente)

Actualizado: 2026-11-14. Contexto vigente: `docs/10-plan-tecnico.md`, §5 y §9;
`origin/dev` en `0e00fc3` integrado conservando los commits locales; decisiones
de Javi J0/J10 de `461507a`. Prioridad: desbloquear a Marta y
entregar los datos que necesitan los demás módulos antes de continuar el visor.

Entrega unificada en `pabloizgui/46-lunar-streetview`: incluye el terreno de #37
y el visor. Índice por destinatario, puesta en marcha con la cuenta de Pablo y
dependencias concretas: [team-handoff.md](team-handoff.md). El PR #72 ya está
publicado como borrador; el bloque de navegación/horizontes v1 se prepara
localmente. No se considera integrado en `dev` hasta revisión y merge.

| Prioridad | Tarea | Estado / criterio de cierre |
|---|---|---|
| P0 | Entrega unificada y revisión | PR #72 borrador publicado. Nuevo bloque v1 local: 31 pruebas Python / 62 web y verificaciones nativas; pendientes publicación de este bloque, CI remoto y revisión. Límite gstack documentado, sin merge automático |
| P0 | Adquirir DEM LOLA 5 m de 87–90°S | Hecho localmente: 3 465 285 714 bytes, SHA-256, metadatos y tres ventanas decodificadas; no validación de todos los píxeles |
| P0 | Exportar recortes científicos | Hecho: herramientas, primer recorte y entrega polar; 24 pruebas Python y verificación JS del producto tras el ajuste J0 |
| P1 | Heightmap polar para Marta hasta −80° | Hecho en rama #37: 1025×1025 Float32 LE + máscara + manifest sobre `layers.json`; producto real PGDA 90 de 80 m |
| P1 | Altitud y pendiente para Marta/Javi2 | Hecho: dos capas 512² gray8 + alfa y GeoTIFF; pendiente del LDSM publicado, no del heightmap reducido; integración pendiente |
| P1 | Datos de terreno de los sitios para Javi | Hecho: CSV/JSON, 20/20 coordenadas cubiertas, píxel nativo 80 m; coordenadas aún del fixture, no métricas de aterrizaje finales |
| P2 | Horizonte científico para Javi / Street View | Seis perfiles experimentales calculados (sur 1°/0,1° y refinamientos; ecuador/norte global 1°). Curvatura exacta, 5 m, hasta 310 km, JSON/CSV + benchmark en `terrain/trials/`. 0 perfiles de producción: pendientes catálogo #48, convergencia angular y validación independiente |
| P2 | Revisión e integración de contrato heightmap | Pendiente: propuesta aditiva por PR a `dev`, revisión Marta/Javi2; no editar su loader sin coordinar |
| P1 | Cámara Street View en todas las orientaciones | Giro local 90°→180°→270°→0° verificado sin error de renderer y sin flechas. Vectores Moon-fixed, clipping, normales geométricas y seguimiento de LOD implementados. QA extendido en ubicaciones/dispositivos y artefactos temporales de LOD pendientes |
| P1 | Street View más amigable | Implementado localmente: sin flechas, arrastre izquierdo/un dedo, rueda/pinza, lectura artificial del relieve, opciones plegadas, vista ampliada, movimiento hasta 200 m y nombres IAU/USGS. QA con móvil emulado; pendiente comprobación en teléfono físico |
| P2 | Sol/Tierra reales y fecha compartida | Consumir `@/ephem` de Javi: vectores anuales 2026–2055, paralaje terrestre exacta; confirmar DE421/DE440. Módulo/datos todavía no disponibles en dev; series actuales mock |
| P3 | Calibrar altura Cesium frente al DEM | Pendiente: varios puntos, mismo frame y datum; no aplicar un offset supuesto |
| P2 | Ubicación libre y enlaces/QR didácticos | Coordenadas libres y desplazamiento local implementados en el visor. Pendiente `selectedPoint`/ruta compartida de Javi2 y QR reproducible; al moverse se invalidan series del sitio original |
| P3 | `grid_metrics.bin`, PSR y productos adicionales | Después de acordar semántica con Javi; no inventar datos ni ampliar contratos innecesariamente |
| P1 | DEM independiente global | Descargado y verificado LDEM_64 V3.1 (530 841 600 bytes, Int16 LE ×0,5 m, MOON_ME DE421). Base de prueba de unos 474 m, no resolución fina global. Polo norte fino y resolución global superior pendientes según catálogo/coste |

## Decisiones de esta entrega

- #37 y #46 se reúnen para compartir un único checkout funcional; se mantienen
  los commits y la rama histórica de datos. El selector Design/Mission y
  `missionConfig` de Javi (#66) ya están integrados.
- Cuenta Cesium de Pablo mediante token público de lectura en `.env.local` o
  variable de build. El endpoint Moon responde 200 en local y 403 para un
  origen externo. No se publica el token ni se modifica el escáner de secretos.

- El trabajo de datos se inició en `pabloizgui/37-terrain-handoff`; ahora está
  integrado junto al visor en #46. Se conservan ambas ramas y sus commits.
- Usar `LDEM_80S_80MPP_ADJ.TIF` para el heightmap general de Marta. El DEM
  de 5 m se reserva para detalle local y cálculos que requieran esa resolución.
- Misma proyección, radio y límites que `layers.json`. La rejilla de malla tiene
  1025 vértices por eje: extremos incluidos, 1024 intervalos; manifest explícito
  para evitar un desplazamiento de medio píxel frente a las texturas.
- Descargar también `LDSM_80S_80MPP_ADJ.TIF` para entregar la pendiente del
  productor con su escala de 80 m; no calcular pendientes científicas sobre la
  malla visual de unos 594 m de separación.
- Datos brutos y productos grandes en `data/` ignorado por Git. Publicar código,
  contrato propuesto y documentación; el paquete entregable se genera aparte.
- Fuente oficial: <https://pgda.gsfc.nasa.gov/products/90>, Barker et al. (2023),
  DOI <https://doi.org/10.3847/PSJ/acf3e1>.

Implementación asistida por OpenAI Codex a partir de las tareas e ideas humanas
del equipo. Este documento no acredita integración ni validación científica final.

## Resultado de la entrega

Productos en `web/public/data/terrain/`; guía: [terrain-handoff.md](terrain-handoff.md).
Paquete original conservado: `data/exports/lunar-terrain-marta-v1.zip`.
Entrega actualizada: `data/exports/lunar-terrain-team-v2.zip`, con configuración
y estados de cobertura/horizonte/efemérides. Ver [ajuste a Javi](javi-context-sync.md).
1 050 625 muestras, 823 469 válidas; las esquinas/bordes del cuadrado fuera de
la cobertura circular quedan enmascarados. Rango de la malla remuestreada:
−6665,05 a 7005,42 m. Paso: 593,76171875 m; no equivale a la resolución fuente.

Siguiente orden: (1) cerrar revisión y publicación de la entrega,
(2) corregir cámara 360° y mejorar la vista, (3) benchmark/horizontes para Javi,
(4) integrar el catálogo final, alinear marcos y conectar efemérides reales.
Pablo puede avanzar en cámara/UX y benchmark sin esperar los vectores.

## Sincronización posterior con dev — 2026-11-14

Pull de `origin/dev` en `0e00fc3`: incorpora #68 (alcance global, #67) y #71
(globo v0 de Marta). Se conserva la entrega local del PR borrador #72; no se
publica ni se mergea ese PR por esta sincronización. Conflictos documentales
resueltos preservando ambas aportaciones y los estados reales de Marta/Pablo.

Información útil y dependencias:

- Toda la Luna seleccionable: Cesium sigue siendo global. El horizonte real,
  pendiente y PSR tienen cobertura propia; fuera de ella se muestra «no terrain»
  o «pending terrain». Javi amplía catálogo y evaluación, no hay que inventar
  métricas para completar coordenadas.
- PR #70, aún abierto, propone contrato v1.1 aditivo. `HorizonProfile` conserva
  los campos previstos en nuestra configuración (5 m; 0,1° para curados).
  Leer su schema como propuesta; no incorporarlo unilateralmente. Añade
  `pending_metrics`, `sun_frac`, `horizon_source` e índices binarios.
- Marta tiene globo, pins y coordenadas en dev. Sus pins propios siguen siendo
  estado local de `src/globe`; `selectedPoint` aún no existe en core. La conexión
  de un punto libre con Street View requiere ese acuerdo con Javi2.
- Siguen ausentes en dev `@/ephem`, los vectores anuales, perfiles calculados
  y `catalog-for-pablo.md`. El plan de implementación de Javi describe entregas
  futuras, no archivos ya consumibles.
- Nueva petición de Marta: teselas a 1 km, luego 200 m, con 72 azimuts (paso 5°),
  más resumen mensual por celda. Difiere de J0/J10 y nuestra configuración de
  1° para celdas de 5 km. Mantener los 0,1° de sitios curados separados y acordar
  coste/formato/resolución de rejilla antes del lote; hacer primero el benchmark.
- Explore v1 de Marta cambia a requisitos duros y orden sin pesos (#73), mientras
  §10 de Javi mantiene score ponderado. Ambos documentos reconocen el acuerdo
  pendiente; no cambiar por nuestra cuenta contratos ni la lógica de score.
- PR #72 sin comentarios, reviews ni comentarios inline al consultar. No hay
  comprobaciones CI reportadas sobre su head remoto; no afirmar aprobación.

Verificación de la integración local: 53 tests web y TypeScript correctos.
El primer intento de Vitest sufrió EBUSY en el watcher de Cesium bajo OneDrive;
el reintento con `CHOKIDAR_USEPOLLING=1` pasó. No se ha probado el giro WebGL 360°.
Siguiente bloque recomendado: cámara/legibilidad y benchmark de un horizonte;
después conectar el contrato y vectores cuando entren en dev. La nueva rejilla
y el polo norte amplían el alcance, no son entregables ya implementados.

## Actualización del visor, 15 de noviembre de 2026

El adaptador de Street View conserva los vectores horarios de Javi, el paralaje
topocéntrico y el margen del enlace. Los discos esquemáticos usan radio solar
0,2666° y radio terrestre angular asin(6371 km/distancia). La fracción de disco
supone un horizonte recto a través del disco. Para un punto libre se indica el
horizonte de la esfera. Girar la cámara reutiliza la muestra calculada.

La prueba con los binarios publicados sitúa el centro terrestre a −28,345° en
el enlace de Pablo (−14,24842526°, −110,35066553°, 2027-01-01 00:00 UTC).
En Amundsen West el 12 de enero a las 12:00 UTC queda a +0,218°, detrás de
un perfil LOLA de +3,171° a ese azimut. La comparación independiente del
equipo con JPL está en [Horizons](../../validation/horizons-check.md).

## Entrega del plan de Street View del 15 de noviembre

Esta nota sustituye los pendientes de interfaz y despliegue descritos arriba.
Las ramas se publicaron desde dev b8c323e. Al reanudar se cotejó origin/dev
54b9cbb, que añade la entrada iluminada en Mons Hadley, fechas en Normal/Expert,
pins en el store y assets de Mission. Al integrar conservar SHOWCASE, startView
y el selector compartido del equipo.

| Bloque | Issue | PR contra dev | Commits de la rama |
| --- | --- | --- | --- |
| Discos Sol/Tierra y margen del enlace | #46 | #142 | 985f1d8, faf50bf |
| Movimiento hasta 500 m | #136 | #143 | 470a7e1 |
| Controles, QR y pantalla completa | #137 | #144 | 2f69c7c |
| Astronauta suministrado, arrastre móvil | #138 | #145 | 59afd38 |
| Auditoría de fuentes y cobertura | #139 | #147 | 6e4df81 y cierre documental |
| Altura ausente en la malla | #146 | #148 | a971691 |

El paso conserva hasta 101 consultas de suelo cada 5 m y dura hasta 2,4 s.
La textura original es el modo inicial y tras reintentar. El QR conserva
UTC, coordenadas, altura y cámara. La pantalla completa usa la API nativa y
un modo ampliado en navegadores que la carecen. El astronauta tiene caja de
56 px, PNG RGBA de 512 px y balanceo CSS durante el arrastre. Para ambas poses
se usa la única imagen recibida. Conserva una firma discreta ChatGPT y
metadatos de procedencia. La Tierra y el Sol se dibujan como discos esquemáticos
con diámetros angulares, sin fase ni textura fotométrica.

Chrome verificó cinco regiones, el disco de la Tierra al orientar la cámara,
salida al mapa única, QR, fullscreen nativo y fallback móvil con scroll
restaurado. La emulación táctil verificó tap y arrastre → vuelo → Street View.
El fallo exacto (0°,180°) ofrece abrir expresamente suelo medido a 43 m,
conservando UTC y las coordenadas elegidas. La publicación vigente de Vercel
abrió terreno en una sesión limpia sin introducir clave, con HTTP 200 de Cesium.

La combinación local de los bloques sobre b8c323e pasó 521 pruebas en 57
archivos. La repetición final de TypeScript, lint selectivo y build, con el último
ajuste de altura incluido y la clave pública del código, terminó correctamente.
La compilación avisa del tamaño de los bundles Cesium/Three. Lint de la web completa
terminó con cero errores y dos avisos previos de Fast Refresh en Figure.tsx y
HistoricControls.tsx. No atribuir estos resultados al dev posterior 54b9cbb.

### Revisión e integración del equipo

- Revisar los seis PR y ejecutar los checks en GitHub antes de integrar.
  #143 y #148 coinciden en los imports de LunarViewport.tsx. Conservar
  MAX_WALK_DISTANCE_M y MissingSurfaceHeight. #142, #144 y #148 modifican
  StreetView.tsx; mantener también el nuevo startView de #134.
- Marta y Pablo deben revisar el control en teléfono físico, Safari/iOS,
  la esquina inferior derecha y el panel de Explore con los nuevos pins.
- Javi y Marta deben acordar DEM, resolución y presupuesto para el horizonte
  topográfico por demanda. La propuesta y sus costes están en
  [global-lunar-detail-audit.md](global-lunar-detail-audit.md). Los 41 perfiles
  siguen disponibles para sus posiciones y altura; el resto conserva la
  estimación geométrica declarada.
- Javi2 puede desplegar tras la revisión. La comprobación del token corresponde
  al despliegue observado, con sus URLs autorizadas y su configuración actual.
- Los inputs de Marta y Javi mantienen su ubicación en web/public/data/terrain
  y web/public/data/horizon. El plan de interfaz no regenera esos datos.

## Integración autorizada del 15 de noviembre

Pablo autorizó resolver los conflictos y fusionar los PR en GitHub. #142,
#143, #144, #145 y #148 quedaron integrados en dev mediante squash, con
checks correctos. El cierre documental se integra mediante #147.
Se conservaron startView/SHOWCASE, el selector de fecha y los pins del store.
Los conflictos de imports y del registro compartido se resolvieron conservando
las funcionalidades y las atribuciones de ambos lados.

La integración local con dev 54b9cbb pasó 529 pruebas en 58 archivos,
TypeScript, lint selectivo y build. El código resultante de los cinco merges
se cotejó con esa combinación verificada. La compilación conserva el aviso
de tamaño de bundles. Quedan la prueba en teléfono físico/Safari y el acuerdo
sobre datos y presupuesto para horizonte topográfico global por demanda.
