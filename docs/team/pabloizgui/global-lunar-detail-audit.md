# Detalle global de la superficie lunar

15 de noviembre de 2026 · Pablo · #139. Base de integración `b8c323e`.

## Qué ve el usuario

Explore usa una esfera con la textura LROC de 4096 × 2048 (JPEG de 2,86 MB,
unos 32 MiB decodificada en RGBA antes de mipmaps). El parche de Marta cubre
80–90° S, con 1025 × 1025 vértices separados 593,76 m en la proyección polar.
Procede del DEM de 80 m. Las dimensiones, el registro de vértices y la máscara
están en [heightmap.json](../../../web/public/data/terrain/heightmap.json).

Street View usa el asset 2684829. En el ecuador la fuente ofrece relieve de
unos 59 m e imagen de 100 m. Los dos polos incluyen relieve de 5 m entre
87,5° y 90°, con imágenes NAC de hasta 1 m dentro de la banda polar de 85,5°.
La resolución en pantalla depende también de la tesela cargada, la pendiente,
la distancia y la iluminación de la imagen. [Ficha oficial de Cesium Moon](https://cesium.com/platform/cesium-ion/content/cesium-moon/).

## Prueba de cobertura

Chrome de escritorio con WebGL por software, visor nuevo, sin introducir token.
UTC 2027-01-01 00:00. La captura se tomó con la cámara quieta 5,5 s después de
que el visor admitiera controles. Los tiempos incluyen arranque y red local.
Los recuentos corresponden a respuestas HTTP 200 del host de assets, incluidas
repeticiones y caché del navegador. No representan teselas únicas ni VRAM.

| Coordenadas (latitud, longitud este) | Tiempo hasta resultado | Respuestas de assets | Observación |
| --- | ---: | ---: | --- |
| 0°, 0° | 45,5 s | 245 | Suelo continuo, skyline bajo, poco contraste de cerca. El disco de la Tierra aparece al orientarse hacia ella. |
| 0°, 180° | 13,5 s | 218 | Llegaron las teselas. Dos aperturas devolvieron altura vacía en la coordenada exacta. |
| −14,24842526°, −110,35066553° | 6,6 s | 206 | Pendiente inclinada y silueta angular; la imagen a ras de suelo tiene poco detalle. |
| −89,9°, 0° | 21,6 s | 364 | Crestas visibles, contraste fuerte y sombras en la imagen original. Este punto difiere del sitio SR1 publicado. |
| +89°, 0° | 28,4 s | 503 | Perfil ondulado y facetas cercanas; el proveedor también publica detalle polar en el norte. |

La apertura independiente de Shackleton SR1 en sus coordenadas del catálogo
(−89,7755°, −156,448°) cargó con el horizonte LOLA. En la antípoda, el sondeo
a menos de un metro tampoco dio altura; en (0,001°, 179,999°) sí dio unos
5324 m en el sistema de la malla visual. El seguimiento #146 conserva la
coordenada original y ofrece abrir expresamente suelo cercano muestreado.

En esta base el visor arranca con error de pantalla 8 y refina a 4. El presupuesto
de caché es 128 MiB con puntero grueso y 256 MiB en escritorio, además del
desbordamiento configurado. El modo preview explícito comienza en 16; Mission
solicita detalle completo en su adaptador actual. No se midió VRAM física ni
un percentil de latencia móvil. Un cambio global de SSE requeriría comparar
latencia, memoria y calidad en el mismo dispositivo. No hay evidencia aquí
para aumentar la descarga en toda la Luna.

## Horizonte topográfico por demanda

Javi puede usar los 41 perfiles publicados para los sitios y altura que coinciden.
Para cualquier otro observador la aplicación calcula Sol y Tierra con las
efemérides horarias y declara el horizonte geométrico. La altura muestreada
para la cámara no alimenta el cálculo científico.

Para extender la cobertura, servir un DEM versionado por teselas con máscara
NoData y metadatos de referencia. Para una distancia angular central θ, radio
del terreno r y radio del observador r₀, la elevación aparente es
`atan2(r cos θ − r₀, r sin θ)`. El horizonte de cada azimut toma el máximo de
los ángulos cubiertos; conservar explícitamente los tramos desconocidos.
La caché debe incluir coordenadas, altura, versión de DEM, paso de azimut y
alcance. Reutilizar resultados entre fechas y deduplicar solicitudes simultáneas.

Como presupuesto orientativo, 360 direcciones × 3100 distancias (paso uniforme
de 100 m hasta 310 km) son 1,116 millones de muestras por punto; a 0,1° son
11,16 millones. El perfil de 3600 ángulos ocupa unos 14 KiB en float32 sin
metadatos. El paso uniforme sirve para estimar coste; la convergencia en
terreno cercano requiere las bandas de muestreo del equipo. Antes de publicar
resultados: medir latencia y accesos al DEM, limitar trabajos simultáneos,
comparar el piloto contra los perfiles existentes y acordar resolución con
Marta y Javi. Para mejorar el aspecto de una zona concreta hacen falta imágenes
ortorrectificadas y un DEM de mayor resolución con fuente, escala y registro
compatibles. Una foto oblicua por sí sola no reconstruye el perfil de un monte.

## Verificación y dependencias

Chrome confirmó el enlace voluntario a 43 m, UTC conservada y superficie cargada
con altura visual de 5324,1 m. El token incluido también abrió una sesión limpia
en dark-side-landing.vercel.app con respuesta 200 del endpoint y de 169 recursos
de assets en esa ejecución. La comprobación de Vercel corresponde al despliegue
vigente el día de la prueba. Los cambios de interfaz se probaron en local.

La verificación móvil emulada cubrió toque, arrastre → vuelo → Street View,
pantalla ampliada sin API nativa, QR contenido en 390 px y restauración de
scroll. Quedan a cargo del equipo el teléfono físico y la decisión sobre DEM
y presupuesto para cálculo global. Las capas científicas y el heightmap de
Marta mantienen sus formatos publicados.
