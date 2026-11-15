# Guion — Moonfall (29,5 s)

Tiempos de voz **medidos** sobre [vo/Charon_fast.wav](vo/Charon_fast.wav) (27,0 s; huecos detectados con
`ffmpeg silencedetect`). Son aproximados (±0,2 s): ajustar el corte visual a la palabra.

| # | Voz (inglés) | Voz | Imagen | Texto en pantalla |
|---|---|---|---|---|
| 1 | "Pick any spot on the Moon. Would your mission survive?" | 0,0–2,9 | La Luna entera con el mission clock acelerado; el terminador barre la esfera | **Would you survive here?** |
| 2 | "Run the clock. Watch sunlight sweep every crater." | 3,7–6,5 | Zoom continuo al polo sur; sombras de los cráteres girando (sin corte) | Real NASA orbit + terrain data |
| 3 | "Drop to the surface. Is the Sun up? Can you see Earth?" | 7,3–10,5 | Caída del 3D a Street View: horizonte, Sol rasante, Tierra sobre la cresta | ☀️ Power · 🌍 Signal home |
| 4 | "Make it a game: an emergency, four sites, one choice." | 11,4–14,6 | 🎬 El profe lanza la misión en el proyector → app real: alarma roja y las 4 cartas | — |
| 5 | "Your class votes from their phones." | 15,3–16,7 | 🎬 Manos eligiendo en el móvil → interfaz móvil real con contador de votos | Contador de votos |
| 6 | "Then the Moon plays it out, and the teacher shows why." | 17,5–20,3 | Veredicto real en el proyector; 🎬 unos celebran, otro cae en la cuenta; el profe señala el globo | Veredicto real (p. ej. "Out of sunlight") |
| 7 | "Simple for a class. Deep for engineers. Moonfall: where would you land?" | 21,2–27,0 | Normal vs Expert en la app → cierre con nombre | **Moonfall** · lunar-site-evaluator.vercel.app · QR |
| — | (sin voz) | 27,0–29,5 | Logo + URL + QR fijos | — |

🎬 = clip generado en Higgsfield, con "Generated with AI" abajo a la derecha.

## Por qué este orden
- Hook con el plano más vistoso (la Luna girando) y una pregunta abierta que el vídeo contesta: el hook promete una
  respuesta y el final la da (la clase la descubre jugando).
- La transición 3D → Street View llega antes del segundo 10: es la imagen que se recuerda.
- El aula aparece cuando ya se ha entendido la mecánica; se ve como lo que aporta, no como una función más.
- El cierre repite la pregunta del arranque ("Pick any spot…" → "where would you land?").
- Datos NASA en pantalla, no en voz (ahorra palabras, suma en *Relevance*).

## Notas de continuidad
- 1→2→3 es una sola cámara continua (globo → polo → suelo); no cortar, encadenar por movimiento.
- Acento de color: ámbar del look Mission (palabra clave de los subtítulos). Un acento, una cosa se mueve a la vez.
- La explicación del profe (beat 6) usa las mismas herramientas de los beats 2–3 (luz, Tierra visible).
