# Integración final de Street View con las efemérides

2026-11-14 · Pablo · implementación asistida por OpenAI Codex.
Petición humana: sincronizar dev sin pérdida local y completar lo pendiente de
su herramienta, sin detenerse a pedir decisiones mientras Pablo duerme.

Base integrada: dev `9c69779` (#70, #72, #75, #77, #78, #79). Se conserva
`b857148` y `e5d7209`, respaldo `backup/pablo-streetview-before-ephem-20261114`,
y stash `d43e0eb059a472664e0d03e1c168a85ad1399d27` con las notas privadas.
La rama antigua ya se mergeó por squash; nueva rama de trabajo:
`pabloizgui/38-streetview-ephemerides`.

## Cierre funcional

1. Consumir `@/ephem` para cualquier ubicación/fecha 2026–2055, con altura
   independiente del DEM y paralaje de la Tierra; no usar series mock.
2. Exportar el catálogo fuente de 59 puntos para el visor. Los 20 ids existentes
   cambiaron coordenadas: nunca asociarles el horizonte del antiguo fixture.
3. Calcular horizonte/pediente de los 41 puntos polares con las nuevas
   coordenadas; adquirir norte y PSR de ambos polos. Validar unidades, cobertura,
   curvatura, alcance y refinamiento; conservar limitaciones cuantificadas.
4. Conectar horizontes con los cálculos compartidos, conservar fallback explícito
   para puntos libres y altura modificada. No presentar la malla Cesium como DEM
   numérico ni aplicar un offset constante. Mostrar comparación de alturas.
5. Fecha reproducible y enlace/QR con coordenadas, cámara y reloj compartido.
   La URL no contiene el token. Localhost no es accesible desde otro teléfono;
   despliegue/origen permitido sigue bajo control de la cuenta/dominio de Pablo.
6. Mantener navegación móvil, lectura del relieve, rótulos y carga diferida.
   Pruebas automáticas y en navegador, sin modificar el diseño general ni los
   módulos de juego, score o globo. Las integraciones compartidas se documentan.

El marco publicado es `MOON_ME_DE440_ME421`; Javi documenta su alineación con
ME/DE421 y validación contra Horizons en `docs/validation/horizons-check.md`.
No requiere inventar una rotación entre ME y PA. Los perfiles siguen el contrato
v1.1 de `horizon/<id>.json`, azimut norte local horario, 5 m y 0,1°.

Los pendientes de otras personas se registrarán como tales: no se desarrollará
un juego ni un mapa de calor de Javi para declarar artificialmente cero pendientes.

## Sincronización y datos — 2026-11-15

También se integra dev `0b8f028`: export real de 59 sitios (#81), rejillas (#82),
Explore (#80/#83), Mission (#85) y alunizajes históricos (#86/#89). Los ficheros
de estas entregas se conservan. La evaluación del exportador de Javi aún usa
horizonte plano, elevación 0 y pendiente/PSR pendientes: no confundir eso con
el cielo SPICE y los perfiles que consume directamente Street View.

Entregables numéricos: `terrain/catalog.json` y CSV (59 sitios) y
`horizon/<id>.json` (38 sur + 3 norte). Muestreo nativo 5 m en el recorte sur,
80 m en los demás puntos polares y 240 m para relieve lejano, con respaldo
global LOLA de ~474 m. Observador 5 m, 0,1°/3600 azimuts, alcance 310 km.
Pendiente polar del LDSM nativo 80 m; pendiente no polar aproximada sobre el
DEM global con base de 1 km, marcada `slope_coarse`. No son pendientes de
seguridad del área de aterrizaje ni una media espacial.

La elevación de un objetivo a distancia superficial d es
`atan2((R+zt)cos(d/R) - (R+z0+h), (R+zt)sin(d/R))`, R=1737400 m.
Máximo por azimut, sin refracción. Se compara refinamiento radial sucesivo
y se comprueban puntos medios de la rejilla angular a 0,05°; objetivo
numérico ≤0,05°. Se publica por perfil el cambio 300→310 km; no demuestra
ausencia de terreno más allá de 310 km ni precisión física de 0,05°.

Las PSR se leen de las máscaras binarias nativas de 20 m (PGDA 90/98), sin
overviews promediados. Agregación any-positive a 240 m, distancia geodésica
al centro ocupado más próximo y cota espacial conservadora ±0,19 km; clase
interior de PSR consultada a 20 m. Fuera de los casquetes 80–90° se guarda
`psr_dist_km: null` y la distancia al mapa como cota superior. Incluso dentro
del casquete se exige que la distancia más su error no alcance la frontera
para afirmar que una región sin cobertura no puede estar más cerca.
No representa error total del modelo PSR ni prueba de hielo.

Reproducción desde raíz con los datos de `config/terrain-sources.json`
descargados y `requirements-terrain.txt` instalado:
`python -m python.terrain.catalog`, después
`python -m python.terrain.validate_horizons` y
`node scripts/check-terrain-delivery.mjs`.
Los pasos son reanudables y escriben JSON atómicamente. El hash de código
del caché cambia también al ampliar los pasos angulares aceptados: puede
causar recálculo aunque las alturas a 0,1° sean iguales. Se conservan las firmas
reales de cada ejecución en el resumen; no se falsifican para forzar el caché.
No ejecutar `prepare_handoff` sobre estos perfiles: es la entrega de planificación
antigua y rechaza correctamente sobrescribir su estado.

En un punto libre se desconoce la elevación científica del DEM en el navegador:
el paralaje usa explícitamente la esfera de referencia + altura del ojo, nunca
la malla Cesium sin calibrar. Cambiar lugar o altura invalida un perfil de 5 m.
El visor presenta esta limitación y compara malla/DEM donde hay dato independiente.

Los enlaces solo contienen coordenadas, UTC, azimut, elevación, FOV y altura.
El QR es SVG local, biblioteca MIT de Nayuki conservando licencia; no se envía
ubicación ni token a un servicio QR. Captura congelada al abrir, recaptura explícita
si el reloj avanza. Prueba independiente ZXing sobre el SVG realmente renderizado:
decodificación exacta del enlace capturado. Arrastre, pinza y tap comprobados en
emulación móvil de Chrome; teléfono físico pendiente. El reloj elegido se conserva
ante la carga tardía del manifiesto y la ruta anterior recupera Shackleton tras
Explore/Peary. La verificación usa las comprobaciones nativas autorizadas y QA
de navegador; no acredita la ejecución completa del flujo automático de gstack.

## Verificación final — 2026-11-15

- 235 pruebas web correctas; TypeScript y ESLint correctos. Vitest con CHOKIDAR_USEPOLLING=1 por EBUSY del watcher nativo sobre assets Cesium en OneDrive; no se excluyen pruebas ni archivos.
- 35 pruebas terrain correctas en una exportación exacta del árbol Git fuera de OneDrive. En la carpeta sincronizada se observó un bloqueo transitorio de rename; se mantuvieron todas las comprobaciones y se verificó la misma fuente/datos en Temp.
- 70 pruebas de python/ephem y export correctas con los kernels oficiales locales. Entorno terrain Python3.13; CI del módulo de Javi conserva Python3.12/uv del equipo.
- Verificador JS del producto correcto: hashes originales, Float32 LE, máscara, rejilla, PNG y 41 perfiles completos/coordenadas/refinamientos. Máximo radial 0,042015° y angular 0,027818°; cambio 300→310 km cero en estos puntos, sin extrapolar esta conclusión más lejos.
- Prettier correcto sobre export Git con core.autocrlf=false (el archive con autocrlf activado convierte finales de línea y no reproduce CI Linux). Build correcto; permanece el aviso de chunks grandes Cesium/three, cargados de forma diferida.
- Chrome: QR de 2034 conserva UTC, posición y cámara; SVG renderizado decodificado por ZXing; captura permanece fija durante Play. Producción local también muestra QR y horizonte real. Peary usa perfil norte; Apollo11 muestra fallback geométrico. Última muestra 2055-12-31T23:00 no se sobrepasa con +1h.
- Móvil emulado iPhone13: arrastre cambia azimut, pinza cambia FOV65→46°, tap desplaza y descarta el perfil anterior. Giro360° de cámara vuelve al azimut inicial sin error de renderer. Atrás tras Explore/Peary recupera ruta/coordenadas de Shackleton.
- Correcciones de integración compartida: contador interno de intención del reloj, bloqueo del feedback URL→store→URL durante sincronización, herencia de selectedPoint solo para su sitio. El selector delega navegación en ModeSync. Se omite en StreetView el resumen global de una serie 2027 que no representa puntos/fechas libres.
- Auditoría documental independiente completada sin bloqueos. Escaneo exacto de la clave local: ausente de los492 archivos del candidato, .env.local excluido. La clave sigue fuera de Git y del QR.
- El issue38 describe teselas por celda: esta entrega publica perfiles puntuales curados y no lo cierra automáticamente. La rejilla científica global y la adopción del terreno en scoring siguen bajo coordinación del equipo. Teléfono físico y calibración visual, pendientes explícitos.

Se usan /qa y /ship de gstack como guías con revisión nativa y auditoría documental;
no se afirma que todos sus helpers automáticos/segundas revisiones externas hayan
pasado. Continúa la autorización de Pablo para comprobaciones nativas y push/PR,
sin merge a dev ni a main. Telemetría desactivada; no se cambia CLAUDE.md.
