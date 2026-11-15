# Skills usadas para planear el vídeo

Copiadas **sin modificar** desde el proyecto `video_editor` de Javi el 2026-11-15, para que quien produzca el vídeo
las tenga a mano. No están en `.claude/skills/` a propósito: así no se activan solas en la IA de cada compañero.

## Cómo usarlas
Copia la carpeta de la skill que quieras a tu `.claude/skills/` (o `~/.claude/skills/`) y reinicia Claude Code.
Mínimo recomendable para producir el vídeo: `animated-video` + `content-principles`.

| Skill | Para qué | Origen / licencia |
|---|---|---|
| `animated-video/` | Animar en código con Remotion (plantillas, estilos, revisión, prueba en silencio) | cstack (Charles Zheng), MIT: [LICENSE-cstack](LICENSE-cstack). Incluye texturas de la Tierra de NASA Blue/Black Marble (dominio público; citar a NASA). |
| `video-script/` | Guion y checklist de narración | cstack, MIT |
| `content-principles/` | Psicología del contenido corto | https://github.com/aiwithremy/content-principles (Remy Gaskell). **Sin archivo de licencia**: su autor la ofrece para uso libre según Javi; uso interno del equipo, no redistribuir. |
| `social-virality/` + `social-virality-tv2/` | Formatos y hooks virales y su paso a vídeos animados | Hechas por Javi. Se apoyan en un corpus de terceros ("100 Viral Formats") que **no** se incluye; `social-virality/references/format-catalog.md` enlaza a publicaciones de terceros. |

## Qué NO se ha copiado
`video-edit` (24 MB, montaje de tomas de cámara; incluye efectos de sonido de Instagram sin licencia verificada),
`asset-library`, `reflect` y `rsi` (no hacen falta para este vídeo).

## Notas
- Las skills de `social-virality*` y `animated-video` están en la forma original (algunas en español); no las he adaptado a este repo.
- Este repo era público al subirlas; el equipo lo hará privado. Si vuelve a ser público, revisar `content-principles` y el catálogo.
- Si una skill choca con las reglas del concurso (`docs/01-hackathon-rules.md`), mandan las del concurso: sin menores, marca de agua en IA, sin branding NASA.
