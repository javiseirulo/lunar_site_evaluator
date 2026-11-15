# Higgsfield — prompts para mejorar el módulo Mission (para Pablo)

> Ideas aprobadas por Manuel (2026-11-15). Prompts redactados con IA (Claude Code). Generar en Higgsfield (web o CLI),
> subir a `web/public/game/` con el **nombre exacto** indicado y abrir PR contra `dev`. El cableado en código lo hace Mission.
> Issue: #127. Guardado por martaplatero2002-star.

## ⚠️ Comprobación del CLI (2026-11-15, martaplatero2002-star + Claude Code)
- Workspace `Private`, plan **ultra**, **10 créditos**.
- `higgsfield generate cost` **no da 0** en ninguno de los modelos del encargo desde el CLI:
  `nano_banana_pro` (Nano Banana Pro, 16:9 2k) = **2 créditos**, `nano_banana_flash` (Nano Banana 2) = **1,5**,
  `seedance_2_0` = **22,5** por vídeo (no llega ni a uno). `text2speech_v2` necesita `variant`, `voice_id`, `voice_type`.
- Conclusión: el modo ilimitado **no se aplica por CLI** (o al menos no aparece en el coste). **Generar desde la web de
  Higgsfield**, comprobando que el coste mostrado sea 0 antes de lanzar. No se generó nada por CLI para no gastar créditos.
- IDs del CLI por si se usa: Nano Banana Pro = `nano_banana_pro` (ojo: `nano_banana_2` es alias de Pro),
  Nano Banana 2 = `nano_banana_flash`, Seedance 2.0 = `seedance_2_0`, TTS V2 = `text2speech_v2`.
- `deliverables/research/higgsfield.md`, citado abajo, **no existe** en `origin/dev` a fecha de hoy.

## Reglas para todo el set
- **Solo modelos ilimitados**: Nano Banana Pro / Nano Banana 2 (imagen), Seedance 2.0 (vídeo), Text to Speech V2 (voz).
  Antes de lanzar en serie, `higgsfield generate cost ...` (o mirar el coste en la web) debe dar 0. Quedan 10 créditos: no gastarlos.
- **Coherencia**: pasar SIEMPRE como referencias de estilo 2–3 imágenes actuales del pack
  (`sites/site-rim-1.png`, `menu-bg.png`, `lander/lander-side.png`). Que parezca el mismo juego.
- **Sin texto, logos, banderas, parches ni insignias**. Nada de personas menores de 18; astronautas con visor opaco.
- Transparencia: los generadores no dan PNG con alfa. Pedir **fondo verde plano #00FF00** y recortarlo después
  (lo hace Mission con un script; tú solo entrega el PNG con verde).
- Añadir al final de cada prompt el **NEGATIVE** de abajo (o como negative prompt si la herramienta lo admite).
- Apunta en `web/public/game/prompts-log.md`: archivo, modelo, ajustes, prompt, URL de Higgsfield.

**STYLE** (pegar al principio de cada prompt de imagen):
```
Retro sci-fi game art matching the reference images: deep navy-black space, grey realistic lunar regolith, very low Sun
skimming the horizon with long hard shadows (lunar south pole), warm amber accent light, clean linework, flat cel shading
with soft rim light, high contrast, readable at small size.
```
**NEGATIVE**:
```
text, letters, numbers, captions, UI labels, watermark, signature, logo, insignia, mission patch, flag, agency emblem,
real astronaut faces, children, teenagers, blue sky, atmosphere, clouds, water, vegetation, blurry, low resolution
```

---

## 1. Cabina del lander (vista de la simulación)
La ventana de la cabina ya la dibuja el código con el Sol y la Tierra en su **posición real** (`cockpit/WindowScene.tsx`).
Por eso NO generamos lo que se ve por la ventana: generamos el **marco interior** con la ventana vacía, y el código la rellena.

**1a. `cockpit/cockpit-frame.png`** — Nano Banana Pro, 16:9, 2k, refs: `lander/lander-side.png`, `menu-bg.png`
```
[STYLE] Interior of a small lunar lander cabin seen from the pilot seat. A large rounded-rectangle window in the
upper-centre of the frame, its glass area filled with flat pure #00FF00 green (nothing visible through it). Around it:
riveted metal bulkhead, padded panels, cable bundles, small amber and green indicator lamps, a few unlabeled toggle
switches. Lower third left mostly empty and dark for an overlaid instrument panel. Symmetrical, front-facing, no people.
```
**1b. `cockpit/panel-bg.png`** — Nano Banana Pro, 21:9, 2k, mismas refs
```
[STYLE] Front-facing flat texture of a lander instrument console surface: brushed dark metal, screws, subtle scratches,
empty rectangular recessed bays for gauges (bays are plain dark, no dials, no text), thin amber edge light. Even
lighting, no perspective, tileable left-right.
```

## 2. Veredictos animados (`verdicts/*.mp4`)
Seedance 2.0, 16:9, **5 s**, 720p (si queda bien, repetir a 1080p), `generate_audio: false`.
**start_image = end_image = el PNG actual** del mismo nombre → el vídeo vuelve al fotograma inicial y hace bucle.
Prompt común al inicio: `Subtle looping animation of this exact illustration. Keep composition, colours and style identical. Camera locked.`

| Archivo | Imagen inicio/fin | Añadir al prompt |
|---|---|---|
| `verdicts/win.mp4` | `verdicts/win.png` | `The lander stands safe; solar panels catch the low Sun, a gentle glint travels across them, dust settles, stars twinkle.` |
| `verdicts/lose-cold.mp4` | `verdicts/lose-cold.png` | `Frost slowly creeps over the lander, faint breath of vapour, lamps flicker and dim, darkness deepens.` |
| `verdicts/lose-blackout.mp4` | `verdicts/lose-blackout.png` | `The Sun drops behind the ridge, the shadow sweeps across the lander, its lights fade out one by one.` |
| `verdicts/lose-low-sun.mp4` | `verdicts/lose-low-sun.png` | `Weak grazing sunlight flickers on the panels, power lamp blinks amber then red.` |
| `verdicts/lose-low-comm.mp4` | `verdicts/lose-low-comm.png` | `Antenna slowly sweeps searching, Earth sits behind the ridge, a red signal lamp blinks.` |
| `verdicts/lose-slope.mp4` | `verdicts/lose-slope.png` | `The lander creaks and tilts a few more degrees, small rocks and dust slide downhill.` |
| `verdicts/timeout.mp4` | `verdicts/timeout.png` | `The scene slowly loses colour, a soft pulse of amber light, dust drifts.` |

## 3. Emergencias animadas (`emergencies/*.mp4`)
Igual que §2 (Seedance 2.0, 16:9, 4 s, sin audio, inicio = fin = PNG actual).

| Archivo | Añadir al prompt |
|---|---|
| `emergency-propulsion.mp4` | `Engine bell sputters, short bursts of exhaust, red warning light pulses.` |
| `emergency-solar-storm.mp4` | `Waves of energetic particles stream from the Sun, panels flicker, sparks crawl over the hull.` |
| `emergency-guidance.mp4` | `Navigation lamps blink erratically, the craft wobbles slightly on its axis.` |
| `emergency-fuel-leak.mp4` | `A thin plume of venting gas sprays from a tank and dissipates into vacuum, amber alarm pulses.` |
| `emergency-comms.mp4` | `Antenna dish jitters, static-like flicker on the comms lamp, Earth fades behind interference.` |

## 4. Menú vivo — `menu-bg.mp4`
Seedance 2.0, 16:9, 8 s, sin audio, inicio = fin = `menu-bg.png`.
```
Subtle looping ambient animation of this exact illustration: stars twinkle slowly, faint dust drifts across the ground,
the low Sun light breathes very softly. Camera locked. Keep composition, colours and style identical.
```

## 5. Dr. Regolith: expresiones coherentes
Hoy `dr-regolith-talk.png` (1254 px) y las otras cuatro (256 px) no son del mismo tamaño ni siempre del mismo trazo.
Nano Banana Pro, 1:1, 2k, **ref: `characters/dr-regolith-talk.png`** (y la expresión actual como segunda ref).
```
[STYLE] The exact same character as the reference image, same outfit, proportions, palette and pixel-art style,
front-facing bust, centred, on a flat pure #00FF00 background. Expression: <EXPRESIÓN>.
```
| Archivo (sustituye) | `<EXPRESIÓN>` |
|---|---|
| `characters/dr-regolith-neutral.png` | `calm, attentive, slight smile` |
| `characters/dr-regolith-talk.png` | `mouth open mid-sentence, one hand raised explaining` |
| `characters/dr-regolith-happy.png` | `big grin, thumbs up` |
| `characters/dr-regolith-sad.png` | `disappointed, eyebrows down, hand on forehead` |
| `characters/dr-regolith-alarm.png` | `alarmed, eyes wide, pointing at something off-screen` |

Si solo falla la cara, mejor **Nano Banana 2 con máscara** (inpaint) sobre la imagen actual: cambia la expresión sin tocar lo demás.

## 6. Limpieza del pack
Algunos sprites traen una franja oscura de cabecera/rótulo (ver `README.md` del pack). Nano Banana 2, ref = el PNG:
```
Remove the dark header strip and any caption band from this image and extend the artwork naturally to fill that area.
Change nothing else.
```
Mismo nombre de archivo. Ojo: 10 archivos son WebP con extensión `.png`; exportar PNG de verdad.

## 7. Voz de Dr. Regolith — `audio/vo/intro-1.mp3` … `intro-5.mp3`
Text to Speech V2, `variant: elevenlabs`, voz preset (listar con `higgsfield voices`): elegir una **adulta, cálida,
algo excéntrica, tipo profesor**. Una pista por línea de `web/src/game/content/intro.json`, texto **exacto**:
1. "Welcome aboard, pilot. I am Dr. Regolith, and today the Moon's south pole is your office."
2. "Why the pole? Some craters there are permanently shadowed, so cold that water ice survives inside them for billions of years. Ice means water, oxygen and rocket fuel."
3. "Nearby crater rims and ridges can catch long stretches of sunlight, which is ideal for solar power and for keeping a lander warm."
4. "From the pole, Earth hangs low on the horizon. A site with a clear view of it keeps your radio link alive."
5. "Slopes, sunlight, cold and comms all matter. Read the cards, trust the data, and pick your landing site wisely. Choose well, pilot."

Generar 2 tomas de la línea 1 con 2–3 voces distintas, elegir la voz en equipo y hacer el resto con esa.

## Prioridad si no da tiempo
1 (cabina) → 2 (veredictos) → 7 (voz) → 4 (menú) → 5 → 3 → 6.

## Lo que hará Mission al recibirlos (no Pablo)
- `GameImage`: si existe `.mp4`, `<video autoplay muted loop playsinline>` con el PNG como `poster` (fallback).
- `CockpitView`: `cockpit-frame.png` (con el verde recortado) por encima de `WindowScene`.
- `DialogueBox`: reproducir `intro-N.mp3` al empezar cada línea (respetando el botón de sonido).
- Etiqueta visible de arte generado con IA donde se muestren.
