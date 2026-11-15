# Social Virality TV-2 (skill hija)

Skill hija de `social-virality` (v2), creada a petición de Javi el 2026-11-11 ("plantea OTRA skill, que sea hija de esa skill, con adaptaciones para tv2" → "si", con la condición "muy basado en estas cosas nuevas y en la otra skill").

Qué hace: lleva los 100 formatos y los 1000 hooks de la skill madre a vídeos TV-2 (generados 100 % con IA en código, sin vídeo generativo), adaptándolos al pipeline real del repo `video_editor`. No duplica ni modifica a la madre: la madre decide qué hacer; esta decide cómo producirlo en TV-2.

Contenido del paquete:

- `SKILL.md`: activación, relación con la madre y el pipeline, secuencia de trabajo, reglas TV-2 que mandan (D-006 a D-012, C1-C8 del repo), contrato de salida, no negociables, procedencia y límites.
- `references/format-fit-tv2.md`: los 100 formatos clasificados para TV-2 (73 ✅ encajan tal cual en mecanismo, 26 🔧 a adaptar con la conversión concreta indicada y 1 🚫 mejor en TV-1), con guía por familia y regla de experiencias reales aplicable a las cinco familias.
- `references/adaptation-playbook.md`: la mecánica de adaptación, tomada del workflow TV-2 del repo: encargo, guion por escenas (frases cortas como pauta del repo, longitudes orientativas a partir del ritmo medido en las referencias del proyecto, con la cifra definitiva saliendo de la primera locución de prueba), voz Chatterbox es-es fija con cues por palabra, planificación visual con estilos con nombre, continuidad entre planos, columna de audio (música bajita en pista propia), ciclo de revisión con prueba en silencio, y nota sobre los 4 repos candidatos no evaluados (Lemo-Opuscar, HyperFrames, ClaudeAnimationBase, Paper Shaders).
- `references/hooks-voz-sintetica.md`: cómo usar la librería de 1000 hooks con voz sintética y texto en pantalla (texto siempre, voz solo si hay narración, restricciones de la voz, las 16 categorías de la librería en TV-2).

Dependencia: requiere la skill madre `social-virality` v2 (carpeta `social-virality-v2` en este mismo `/skills`). La madre aporta el catálogo de formatos, la librería de hooks, la taxonomía y la rúbrica.

Fuentes: corpus `100 Viral Formats (Format Book)` + doc de 1000 hooks (vía la skill madre, revisión de medios del 2026-11-11), y `docs/video-workflows/README.md` + `tv2-video-ia.md` del repo (rama por defecto, leídos el 2026-11-11). Los claims de aprobación dentro de los documentos del repo se toman como descripción del pipeline vigente; no se verificaron contra el canal de Javi en esta tarea.

Storytelling #01 verificado el 2026-11-12: su vídeo de ejemplo (149 MB, por encima del límite de descarga de la revisión original) se inspeccionó vía el reproductor web de Drive. Es una grabación de pantalla de iPhone del post de Instagram y su ejecución encaja con su ficha; los detalles están en el catálogo de la madre.

Sin promesas de viralidad: heurísticas, no causalidad. Nada de este paquete instala, modifica código ni publica nada en el repo.
