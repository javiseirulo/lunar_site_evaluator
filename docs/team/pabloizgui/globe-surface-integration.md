# Astronauta y mejoras de Street View

2026-11-15 · Pablo · peticiones humanas implementadas con OpenAI Codex.
Base actualizada: dev 0ca606d (#91, #97 globo v2, #98 despliegue, #90 Mission y #101 datos/capas/restyle integrados). Rama pabloizgui/46-globe-streetview.
Las notas privadas están restauradas localmente y conservan una copia en stash; no forman parte de la entrega publicada.

## Alcance vigente

- Solo se añade el astronauta arrastrable como entrada nueva desde el globo.
  Intersecta la esfera o el parche polar visible de Marta, reutiliza su vuelo
  `standHere` ya integrado y abre la ruta existente de Street View con coordenadas
  y el UTC vigente al terminar el vuelo, sin rebobinar el reloj en reproducción.
  Hay alternativa de toque/teclado para quien no pueda arrastrar y cancelación con Esc.
- No se añade otro motor de transición ni otra opción a las fichas. Se conserva
  el acceso Stand here in Street View de SiteList y los controles existentes.
- Retorno rápido a Explore en modo 3D, centrado en el punto compartido.
- Nombres de accidentes más fáciles de descubrir: más candidatos, margen junto
  al borde, colocación alternativa y tolerancia de oclusión hasta el radio del
  accidente (máximo 20 km), para no ocultarlo por su propia ladera. Caso verificado:
  Mons Pico, centro a 24,9 km y ladera a 13,1 km. No son cumbres
  medidas ni nuevas coordenadas científicas; se conserva la fuente IAU/USGS.
- Orientar hacia Sol/Tierra; explicación comprensible del horizonte sin perfil
  calculado. La malla 3D existe; falta el cálculo de oclusión por montañas para
  puntos/alturas que no coincidan con uno de los 41 perfiles.
- Click derecho / doble tap abre guardado con nombre/coordenadas; el toque simple
  camina tras 400 ms. Los pins se comparten mediante core, conservando el formato,
  IDs y clave localStorage lunar-globe-custom-pins de Marta. Sin migración.
- Mayor detalle solicitado a Cesium, antialias 4x, render hasta 2 píxeles por píxel
  CSS y normales suaves cuando la malla las aporta. Sin cambios en tintes.

## Token compartido: autorización explícita actual

Pablo pidió expresamente incorporarlo al código para que sus compañeros no tengan
que introducirlo. cesiumAccess.ts contiene un único token de aplicación público,
con assets:read, solo Moon 2684829 y localhost/127.0.0.1:5173, según configuración
confirmada por su dueño. VITE_CESIUM_ION_TOKEN sigue teniendo prioridad para otro
entorno. No es el token general de la cuenta ni una clave de administración; no se cambian
permisos, dominios ni escáneres. No aparece en enlaces compartidos ni QR.
Prueba real del endpoint: origen local HTTP 200; externo HTTP 403.
Esta decisión actual sustituye para este token público las instrucciones previas
sobre no versionarlo. Cualquier token con scopes privados debe seguir fuera de Git.
Fuente: https://cesium.com/learn/ion/cesium-ion-access-tokens/

## Resolución, texturas y atribución

Una textura no añade vértices ni corrige la silueta de una malla de baja resolución.
El material de detalle posterior puede usar albedo PNG/JPEG/WebP y normal/roughness
PNG. Para datos geográficos reales: ortoimagen GeoTIFF con georreferencia/escala,
o malla glTF/GLB con UV/PBR y teselado 3D Tiles. Las fotos aportadas pueden servir
como referencia de material repetible, sin presentar detalle inventado como
relieve medido ni usarlo en los cálculos. No se cambia saturación ni se fabrica
textura en este bloque sin las referencias que quiera proporcionar Pablo.

La guía oficial exige conservar visible el logo Cesium ion y el crédito de datos.
No se ocultan por CSS ni se eliminan al usar el asset alojado por ion.
https://cesium.com/learn/ion/content-usage-and-attribution-guide/
https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html
https://cesium.com/learn/cesiumjs/ref-doc/CustomShader.html

Astronauta generado con imagegen, PNG transparente, sin insignias ni banderas,
marca AI visible: web/public/streetview/astronaut-ai.png. Es un control ilustrado,
no fotografía ni dato NASA. Se conserva el original generado.

Verificación inicial con dev f6dd86f: 330 pruebas web en 36 archivos,
lint y TypeScript correctos; verificador de entrega de terreno correcto, con
1 050 625 muestras y hashes/máscara conservados. Chrome con emulación móvil
comprueba arrastre → vuelo existente → ruta y cambio de UTC durante el vuelo:
la llegada conserva el UTC nuevo. La prueba en teléfono físico sigue pendiente;
no se afirma que haya terminado el flujo automático completo de gstack.

Actualización de integración con #101: se preserva Explore siempre 3D con
fallback WebGL, Normal/Expert y las nuevas capas de Javi. El retorno respeta
selectedPoint y evita el vuelo inicial al centro original del sitio; las
selecciones posteriores de catálogo conservan sus vuelos. El export de Javi ya
consume los 41 horizontes y terreno; las rejillas por celda siguen geométricas.
La suite con esta base 0ca606d pasa 340 pruebas web en 39 archivos. Tras el guard
final del retorno, lint selectivo, TypeScript y build de producción sin variable
de token también pasan. En Chrome de producción con gesto táctil nativo: se abre
Shackleton con coordenadas compartidas 20° N, 30° E y UTC 2034-04-01T12:00:00Z,
se vuelve al mapa, se espera 2,4 s y se suelta el astronauta en el centro. La llegada
queda en 20,1383° N, 30° E y conserva UTC (error de colocación <0,5°), comprobando
que el vuelo inicial ya no reemplaza el punto observado por el centro del catálogo.
Esta prueba no reemplaza la validación en un teléfono físico. Los resultados
de CI se consultan en el PR #104; esta auditoría documenta las comprobaciones
locales y no afirma una aprobación remota.
