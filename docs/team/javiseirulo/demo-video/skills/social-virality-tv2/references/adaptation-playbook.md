# Playbook de adaptación a TV-2

Cómo se convierte un formato del catálogo en un vídeo TV-2 real. Todo lo técnico viene del pipeline del repo (`docs/video-workflows/README.md`, tronco C1-C8; `docs/video-workflows/tv2-video-ia.md`, pasos 1-8; decisiones D-006 a D-012), leído el 2026-11-11. Si el repo cambia, manda el repo.

## 1. Del formato al encargo (C1)

Antes de escribir nada, el encargo:

- tipo TV-2, plataforma, 9:16 1080×1920, duración objetivo (25-150 s, ideal 45-60 s);
- **una persona concreta** a la que se le habla, no "la audiencia";
- la idea en **diez palabras o menos**;
- referencias (el formato del catálogo con su número, el reel de referencia si lo hay);
- CTA si la hay y sirve al objetivo (regla de la madre);
- ajuste `música`: sí/no (por defecto sí, bajita).

## 2. Guion por escenas

La frase hablada es la unidad de trabajo. Cifras del pipeline (orientativas, no una receta obligatoria):

- **Frases cortas**: la guía TV-2 del repo sugiere menos de unas 9 palabras por frase de guion. Es una pauta de ese documento (no del corpus ni de esta skill), pensada para locución clara; no es un umbral universal para narrar, y las frases habladas de los formatos de texto no aplican aquí porque no hay voz.
- **Ritmo de voz**: las cuatro referencias en español del proyecto miden de 133 a 236 palabras/minuto, con una mediana de unas 190 (medición del repo, no una norma). Con esa mediana, 45-60 s salen unas 140-190 palabras; con los extremos del rango saldrían menos o más. Son números de partida: la cifra buena la da la primera locución de prueba de Chatterbox, se mide con mlx-whisper y se ajusta el guion al resultado, nunca al revés (acelerar la voz para que quepa un texto es la opción de último recurso que el repo menciona, no el objetivo).
- Primeros 3 s: una prueba o una paradoja concreta (cifra con plazo, negaciones en cadena, creencia desmentida). La voz empieza en el segundo 0; el valor llega antes del segundo 10.
- Bucles encadenados: segundo bucle o giro entre el 40 % y el 61 % del vídeo.
- CTA en el último 20 % (las referencias la dicen entre el 78 % y el 93 %), solo si sirve al objetivo.
- Cada cifra o afirmación va a `facts.md` con URL y fecha. Sin `facts.md`, no hay cifras en pantalla.

Del formato al guion:

- **Formato de lista** (la mayoría de Advice/Relatable/Easy): cada punto es una frase hablada o una línea en pantalla con su escena. Ordenar con el punto más fuerte primero (regla del corpus). Los puntos que en el original viven en el caption pueden subir al vídeo para llegar a los 25 s mínimos.
- **Formato de declaración/opinión**: el texto del original se convierte en líneas que entran en secuencia; si hay voz, la voz dice lo que la pantalla muestra con palabras distintas, nunca dobla el texto salvo en los subtítulos.
- **Formato de historia**: beats con sellos (edad, hora, etapa) como columnas; el pago emocional se reserva al último tercio.
- **Parada con Javi**: el guion se aprueba antes de seguir (regla del pipeline).

## 3. Narración con voz sintética

- **Voz fija** (D-007): Chatterbox Multilingual con el modelo es-es y el audio de referencia elegido; la misma voz en todos los vídeos para que la cuenta sea reconocible.
- Se genera **por frases**; se escucha cada una y se regenera la que suene rara. Acelerar un poco la locución y recortar silencios con FFmpeg es un ajuste de último recurso (pauta del repo); la vía principal es ajustar el guion al ritmo medido, no forzar la voz.
- Tiempos por palabra con `align.py`: **todos los cues salen de palabras** (`cue("frase")`), así una voz nueva resincroniza todo el vídeo.
- **Una sola voz**: los diálogos de dos personajes (Advice #06, #17) se resuelven con etiquetas o colores en pantalla, no con una segunda voz.
- Formatos sin voz (muchos ✅ de texto): el guion es la secuencia de líneas en pantalla; entran al ritmo de la música, con tiempo de lectura suficiente (el corpus repite "pacing perfecto: da tiempo a leer cada línea").
- Todo lo generado lleva marca de agua inaudible (Perth); al publicar se declara contenido hecho con IA.

## 4. Planificación visual

- **Estilo con nombre, nunca "moderno y premium"**: uno de los 8 estilos de referencia del repo (Despiece de producto, Maqueta de arcilla, Viaje nocturno, Panel de datos, Editor en perspectiva, Fábrica vóxel, Pegatina plana, Producto en visor), un paquete de `animated-video`, o una referencia concreta. Si no está claro, fotogramas de prueba del mismo beat en varios estilos y Javi elige.
- **La imagen explica; la voz confirma.** Cada paso se entiende sin sonido. La prueba en silencio (C6) es obligatoria y es el juez natural de los formatos de texto.
- **Un acento de color con significado fijo** en todo el vídeo; lo lleva lo que el espectador sigue.
- Un fotograma por beat en los archivos reales de las escenas; si el sentido está en el movimiento, animatic con formas simples sobre la voz. **Parada con Javi**: aprueba el tablero antes de animar todo.
- Objetos reales (un producto, una app) se construyen a partir de fotos o capturas reales, reconocibles como lo que son (C3).
- Traducción del B-roll del corpus: "sigue el B-roll del original" se lee como *cubre cada línea con la escena literal correspondiente*, no como copiar el metraje. Laptop, café, aeropuerto, gimnasio: objetos y escenas dibujados.

## 5. Continuidad entre planos

- **La cámara y las formas llevan la continuidad; se corta cuando cambia la idea.** Cuatro de las nueve referencias del proyecto no tienen ni un corte duro.
- Encadenar planos: match de forma (un círculo se convierte en el siguiente objeto), movimiento de cámara continuo, color que viaja, o texto que se transforma. Cortar solo al cambiar de punto de la lista o de acto.
- **Reglas anti-aspecto-de-IA**: un acento; una cosa se mueve cada vez; muelles amortiguados; nada quieto más de 1 s (los formatos Easy de plano estático llevan deriva sutil continua); sin partículas, arcoíris ni giros 3D gratuitos; texto legible en un móvil (comprobado a 360 px).
- Todo depende del tiempo y es determinista: sin temporizadores, aleatorio con semilla. Se puede rehacer un segundo sin tocar el resto.
- Los personajes y objetos recurrentes se mantienen coherentes entre escenas.

## 6. Columna de audio

- Una sola hoja de cues por vídeo (C5). Cada efecto en su pico medido, comprobado en un exportado de prueba.
- **Música bajita bajo la voz**: atenuada por frases (no palabra a palabra), 10-18 dB por debajo de la voz en los tramos hablados; puede subir en entradas, cierres y pausas visuales. En su **propia pista**, para quitarla o ponerla con el ajuste `música` sin rehacer el montaje.
- El drop se busca por energía y se coloca sobre el momento visual clave (los formatos con "beat drop" del corpus, como Advice #13, mapean aquí su anticipación).
- La música de referencia de cada ficha del catálogo es del creador original: no se usa; se busca cama equivalente por energía.
- Normalización a −14 LUFS. Export 9:16 1080×1920, H.264, yuv420p, BT.709, AAC, +faststart; texto dentro de la zona segura; comprobado con ffprobe (C7).

## 7. Revisión (C6, adaptada a formatos)

1. Borrador a 540p para juzgar ritmo, no nitidez.
2. Hojas de contacto y tiras; legibilidad a ancho de móvil.
3. Puntuación 1-10 por escena (gancho, legibilidad, movimiento, variedad, composición, exactitud, sincronía de sonido). Se arregla lo que está en 7 o menos; no se toca lo que está en 9 o más. Normalmente 2-4 rondas.
4. Jueces nuevos y de solo lectura: un crítico de movimiento y uno de diseño; rechazan por defecto.
5. **Prueba en silencio**: quien lo ve sin sonido resume el vídeo en una frase. Si no puede, no pasa. En formatos de texto es la prueba principal.
6. Escuchar no es leer: se dice qué se escuchó y qué solo se midió.
7. Rúbrica de la skill madre encima de todo esto.
8. Javi decide el gusto.

## 8. Motores y recursos candidatos (no evaluados)

El motor decidido es Remotion + three.js (D-008); las rutas alternativas del propio repo son HTML `seek(t)` + Playwright o HyperFrames, solo si Remotion se queda corto en un encargo. Además, cuatro repos externos fueron revisados (2026-11-11) como **candidatos no evaluados**, sin instalar ni ejecutar nada:

- **Lemo-Opuscar** (github.com/lemomo-ai/lemo-opuscar): 66 estilos hechos en código; posible fuente de estilos con nombre adicionales. Costes en tiempo/tokens según su autor, sin verificar.
- **HyperFrames** (github.com/heygen-com/hyperframes): composición con HTML/CSS/JS; ya pendiente de evaluación en el issue #62 del repo.
- **ClaudeAnimationBase** (github.com/JohnHeibel/ClaudeAnimationBase): aspecto pintado a mano; a lo sumo un experimento acotado (el estilo handmade-2d ya se usó en el vídeo del issue #58).
- **Paper Shaders** (github.com/paper-design/shaders): fondos animados para alimentar escenas; no es un motor por sí solo.

Usar cualquiera sería tarea aparte (issue y PR, con la aprobación de Javi). Esta skill no depende de ninguno.
