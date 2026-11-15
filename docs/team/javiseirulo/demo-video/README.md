# Moonfall — vídeo de demo de 30 s (paquete para producirlo)

- Autor humano de la dirección: @javiseirulo. Redactado con Claude Code el 2026-11-15; la idea del producto es del equipo.
- Issue: #88 (entregable "vídeo de 30 s"). Estado: **dirección, guion y voz listos; falta capturar la app, generar los clips y montar.**
- Límite duro: **≤ 29,9 s** (el concurso descalifica si se pasa). Objetivo: **29,5 s**, 16:9, 1080p, inglés.

## Idea en diez palabras
*"Pick any spot on the Moon and see if you'd survive."* — el juez no sabe planificar un alunizaje; el vídeo
responde "¿sobreviviría mi misión aquí?" con luz real (reloj de misión), suelo real (Street View) y una clase
jugándolo (modo Kahoot).

## Qué hay en esta carpeta
| Archivo | Para qué |
|---|---|
| [script.md](script.md) | Voz en inglés, tiempos medidos del audio real, imagen y texto de cada beat |
| [higgsfield-prompts.md](higgsfield-prompts.md) | Los 3 clips de aula para Higgsfield (con reglas del concurso) |
| [capture-list.md](capture-list.md) | Qué grabar de la app real (y dependencias) |
| [production-principles.md](production-principles.md) | Reglas de montaje/narración resumidas (las "skills", sin copiar nada con licencia dudosa) |
| [vo/Charon_fast.wav](vo/Charon_fast.wav) | **Locución sintética** (Gemini TTS, voz Charon), 27,0 s, sin pausas, ritmo nativo |
| [vo/vo_lines.json](vo/vo_lines.json), [vo/voices.py](vo/voices.py) | Texto y estilo por frase + script para regenerar la voz |

## Cómo producirlo (orden)
1. Grabar las capturas de la app ([capture-list.md](capture-list.md)). El modo clase se está implementando hoy 16:00–23:59:
   **límite para grabarlo: 21:30**. Si no está, usar maquetas rotuladas "preview" (el resto del vídeo no cambia).
2. Generar los 3 clips en Higgsfield ([higgsfield-prompts.md](higgsfield-prompts.md)). Añadir en postproducción la etiqueta
   **"Generated with AI"** (abajo a la derecha) sobre cada clip generado.
3. Montar con la voz [vo/Charon_fast.wav](vo/Charon_fast.wav) como guía de tiempos ([script.md](script.md)). Cualquier motor
   vale (Remotion, DaVinci, ffmpeg); texto en pantalla antes de 0,5 s y subtítulos en inglés (obligatorios si hay voz).
4. Añadir 2,5 s de cierre (logo + URL + QR) hasta 29,5 s. Comprobar duración con `ffprobe` y **≤ 29,9 s**.
5. Subir a un enlace **público** (YouTube/Drive) y probarlo en ventana privada.

## Reglas del concurso que aplican (ver `docs/01-hackathon-rules.md`)
- **Sin menores de 18** en imagen, vídeo o audio. En los prompts: *"university students, early 20s"*; revisar cada clip.
- **Marca de agua visible** "Generated with AI" en todo lo generado (clips). La voz también es IA: declararla en el formulario
  y en `docs/si-usage-log.md` (lo rellena el equipo en persona).
- **Sin branding NASA** en lo generado (logos, banderas, parches). La app sí muestra datos NASA: citar "Real NASA orbit + terrain data".
- Pantallas dentro de clips generados: nunca legibles (la IA inventa interfaces). Lo que se lea en pantalla sale de la app real.
- Nombre **Moonfall**: es la propuesta de nombre del vídeo; **la web aún no está renombrada**. Decidirlo en equipo; si no,
  cambiar solo las dos apariciones del nombre (cierre y última frase de voz).

## Regenerar la voz (opcional)
`vo/voices.py` usa Gemini TTS. Necesita una `GEMINI_API_KEY` propia en un `.env` local (**no se sube**; el plan gratuito da
10 peticiones/día para este modelo). `python3 voices.py list` · `python3 voices.py full charon`. El ritmo depende de la
indicación de estilo: "fast, brisk … about 2.3 words per second" dio 27,0 s; "about 2.0" dio 36 s (no es lineal).

## Origen de las skills usadas
Método: skills `animated-video`, `video-script`, `content-principles` y `social-virality-tv2` (proyecto video_editor de Javi).
No se copian aquí: `content-principles` y los recursos de `video-edit` no tienen licencia redistribuible. Enlaces en
[production-principles.md](production-principles.md).
