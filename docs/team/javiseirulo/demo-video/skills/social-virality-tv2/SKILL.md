---
name: social-virality-tv2
description: Lleva los 100 formatos virales y los 1000 hooks de la skill madre social-virality (v2) a vídeos TV-2 generados 100 % con IA en código (Remotion, sin vídeo generativo ni personas reales generadas). Usar cuando Javi quiera convertir un formato, hook o idea de contenido corto en un vídeo animado del pipeline TV-2, saber qué formatos del catálogo encajan en TV-2 y cuáles no, o transformar un guion en escenas, narración sintética, plan visual con continuidad y columna de audio. Requiere la skill madre; no la duplica ni la modifica.
---

# Social Virality TV-2 (hija de social-virality v2)

Skill hija de `social-virality` (v2). La madre decide **qué** hacer: objetivo, familia, formato del catálogo, hooks y beats. Esta hija decide **cómo** llevarlo a un vídeo TV-2: guion por escenas, narración con voz sintética, planificación visual y continuidad entre planos, dentro del pipeline real del repo `video_editor`.

Nunca copies aquí contenido de la madre: léela y úsala. Si las dos discrepan, manda la madre en lo creativo (qué formato, qué hook) y mandan las reglas TV-2 de esta skill en lo técnico (cómo se produce).

## Fundamento

Construida sobre tres fuentes, en este orden de peso:

1. **El corpus nuevo que compartió Javi** (100 formatos con sus notas de ejecución completas + 1000 hooks en español), ya destilado en la skill madre y su `references/format-catalog.md` y `references/hook-library.md`.
2. **La skill madre `social-virality` v2**: secuencia de decisión, taxonomía, rúbrica y no negociables.
3. **El pipeline TV-2 real del repo** `automatizacionesorganizacionia/video_editor`: `docs/video-workflows/README.md` (tronco común C1-C8) y `docs/video-workflows/tv2-video-ia.md` (pasos 1-8, reglas, decisiones D-006 a D-012). Todo lo técnico de esta skill sale de ahí; no está inventado.

## Secuencia de trabajo

1. **Con la madre**: objetivo y audiencia (su paso 1), familia y formato del catálogo (pasos 2-3), 5 hooks (paso 4), beats (paso 5). No te saltes su rúbrica (paso 8).
2. **Con esta skill**: consulta `references/format-fit-tv2.md` y mira el veredicto del formato elegido:
   - ✅ **Encaja tal cual**: mecanismo directamente producible en TV-2 (normalmente texto en pantalla + escenas en código + música).
   - 🔧 **Adaptar**: el mecanismo sirve, la ejecución original no (cámara real, talking head, metraje físico). Aplica la conversión indicada con `references/adaptation-playbook.md`.
   - 🚫 **No encaja en TV-2**: el mecanismo depende de la presencia real de una persona. Propón TV-1 en su lugar; solo fuerza TV-2 si Javi lo pide, declarando el riesgo de autenticidad.
3. **Hooks para voz y pantalla**: con `references/hooks-voz-sintetica.md`, convierte el hook elegido en su versión TV-2 (texto en pantalla antes de 0,5 s siempre; primera frase hablada en el segundo 0 solo si la pieza lleva narración).
4. **Guion por escenas**: escribe el guion con las pautas de voz del playbook (frases cortas, longitud orientativa según el ritmo medido en las referencias del proyecto) y mapea cada frase a un beat visual.
5. **Plan visual y de audio**: estilo con nombre, hoja de beats con tiempos, cues, música bajita en pista propia, efectos con motivo. Todo según `references/adaptation-playbook.md`.
6. **Contrato de salida** (abajo) y revisión con la rúbrica de la madre más la prueba en silencio de TV-2.

## Reglas TV-2 que mandan

Vienen de los documentos del pipeline TV-2 del repo (`docs/video-workflows/`), que describen el estado vigente del proyecto. No las renegocia esta skill; si Javi dice otra cosa, manda Javi, y si el repo cambia, manda el repo:

- **Todo en código, sin vídeo generativo** (D-006). Nada de metraje realista generado ni personas reales generadas: si aparece alguien, es Javi con su propio material (eso lo monta TV-1) o un personaje dibujado.
- **Motor: Remotion + three.js** (D-008). HyperFrames o HTML `seek(t)` + Playwright solo si Remotion se queda corto en un encargo concreto. Los repos candidatos nuevos (Lemo-Opuscar, HyperFrames, ClaudeAnimationBase, Paper Shaders) son eso, candidatos no evaluados; ver la nota en `references/adaptation-playbook.md`.
- **Duración: 25-150 s, idealmente 45-60 s** (D-012). Los formatos cortos del catálogo (5-15 s) se estiran: más puntos, más beats, ritmo más pausado. Nunca recortar un formato largo por debajo de su pago.
- **Texto en pantalla antes de 0,5 s**; la voz empieza en el segundo 0 cuando hay voz.
- **Voz fija**: Chatterbox Multilingual es-es con la referencia elegida en el proyecto (D-007). Una sola voz: los diálogos de dos personajes se resuelven con etiquetas en pantalla, no con una segunda voz.
- **Música bajita bajo la voz** (10-18 dB por debajo, en su propia pista; ajuste `música` del encargo). Efectos con libertad en TV-2, cada uno con un motivo (REQ-014, C5).
- **Subtítulos karaoke** con la palabra clave en el color de acento.
- **Continuidad antes que cortes**: la cámara y las formas llevan la continuidad; se corta cuando cambia la idea.
- **Honestidad en pantalla** (C3): sin `facts.md` no hay cifras; lo ilustrativo se rotula; al publicar se declara que está hecho con IA.
- **Reglas anti-aspecto-de-IA**: un acento, una cosa se mueve cada vez, muelles amortiguados, nada quieto más de 1 s, sin partículas ni giros gratuitos, texto legible en móvil.

## Contrato de salida (además del de la madre)

La madre ya exige objetivo, formato, hooks, beats, guion, plan de audio y riesgos. Para TV-2 añade:

- Veredicto del formato (✅ / 🔧 / 🚫) con la conversión concreta aplicada si es 🔧.
- Encargo (C1): tipo TV-2, plataforma, 9:16 1080×1920, duración objetivo, persona concreta, idea en diez palabras, ajuste `música`.
- Guion por escenas: frase a frase, con su beat visual, tiempo estimado y cue.
- Estilo con nombre elegido (uno de los 8 del repo, un paquete de `animated-video`, o referencia concreta) y por qué encaja con el formato.
- Hoja de beats: tiempos, imagen de cada beat, qué se mueve y qué texto aparece.
- Columna de audio: frases de voz, música (momento del drop), efectos con su motivo.
- Continuidad: cómo se encadena cada plano con el siguiente (cámara, forma, color).
- Qué se verificó y qué no (incluida la rúbrica de la madre y la prueba en silencio).

## No negociables (los de la madre, más estos)

- Todos los de la skill madre se mantienen: no copiar guiones ni pies de foto del corpus, no inventar credenciales ni pruebas, verificar afirmaciones, no cebo de comentarios, no confundir retención con satisfacción.
- La autoridad que reclama un formato ("como médico...", "como azafata...") tiene que ser real de Javi o desaparecer del hook. Un formato de autoridad sin autoridad real se adapta a "lo que aprendí haciendo X" o se descarta.
- Los números en pantalla (precios, estadísticas) llevan fuente en `facts.md` con URL y fecha. Los números del corpus son del creador original: no se reutilizan.
- La estética "sin producir" de muchos formatos Relatable/Easy no se imita con imperfección falsa: en TV-2 se traduce a composición simple y movimiento honesto.
- Si el formato elegido es 🚫 y Javi insiste en TV-2, dilo claro, declara el riesgo y registra su decisión.

## Procedencia y límites

- Corpus: carpeta `100 Viral Formats (Format Book)` (100 documentos + 100 vídeos + 2 audios, de un tercero, compartida con la cuenta del proyecto) y el doc `1000 HOOKS VIRALES Y SUS EJEMPLOS`. Revisión de medios hecha el 2026-11-11: 100/100 vídeos inspeccionados (99 de forma directa; el #01 de Storytelling, 149 MB y por encima del límite de descarga, se revisó el 2026-11-12 vía el reproductor web de Drive), 21 con narración transcrita, 2 audios transcritos (bases musicales).
- El vídeo de ejemplo de Storytelling #01 ya está verificado (2026-11-12): es una grabación de pantalla de iPhone del post de Instagram y su ejecución encaja con su ficha (slideshow cronológico narrado por texto en pantalla, arco paciente→ortodoncista, segmento numerado, CTA final de follow). Detalles en la entrada del catálogo de la madre.
- El corpus no trae métricas normalizadas: esto es un sistema de heurísticas, no prueba de causalidad. Mejora alimentándolo con los resultados de los vídeos publicados.
- Pipeline: `docs/video-workflows/README.md` y `tv2-video-ia.md` del repo (rama por defecto, leídos el 2026-11-11). Si el repo cambia, manda el repo en lo técnico.
