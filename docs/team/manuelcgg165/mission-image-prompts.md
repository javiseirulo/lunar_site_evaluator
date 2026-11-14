# Prompts de imágenes para el módulo Mission

Para pegar en una IA de imágenes generativas. Todo en inglés (los modelos rinden mejor así).
Cada prompt = **bloque de estilo** + **descripción del recurso** + **bloque negativo**.

## Cómo usarlo
1. Copia el **STYLE BLOCK** de abajo (versión A o B) al principio de cada prompt.
2. Añade la descripción del recurso.
3. Pega el **NEGATIVE BLOCK** como negative prompt; si la herramienta no lo admite, añádelo al final como `Avoid: …`.
4. Usa siempre la misma semilla o la misma imagen de referencia de estilo para que todo el set sea coherente.
   Recomendado: genera primero `site-rim-1` y úsala como referencia de estilo para el resto.
5. Guarda con el nombre exacto de la tabla en `web/public/game/` (el código los cargará por ese nombre).
   Formato: PNG. Sprites con **fondo transparente**. Tamaños orientativos; el código escala.

La estética de la web aún cambia (ahora mismo es "night plate"). El bloque de estilo es intercambiable:
si el equipo cambia de estética, se cambia solo ese bloque y se regenera.

## STYLE BLOCK

**A — Synthwave / classic gaming (la referencia de Manuel):**
```
Retro synthwave illustration with a classic 16-bit video game feel. Deep black sky full of small white stars,
neon violet, hot pink and warm orange glow accents, a magenta perspective grid where it fits, crisp clean
linework, flat cel shading with soft neon rim light, high contrast, slightly stylized but readable.
The lunar ground itself stays grey and realistic in shape (regolith, craters, boulders), lit by a very low
Sun skimming the horizon, with long dramatic shadows, as at the lunar south pole.
```

**B — Pixel art (para personajes y sprites):**
```
Clean 16-bit pixel art, limited palette (max 32 colours), crisp pixels with no anti-aliasing and no blur,
1px dark outline, retro RPG / adventure game style, neon violet, pink and orange accents on a dark background.
```

## NEGATIVE BLOCK
```
text, letters, words, numbers, captions, watermark, signature, logo, insignia, mission patch, flag,
agency emblem, real astronaut faces, celebrity likeness, children, blue sky, atmosphere, clouds, haze,
water, vegetation, high noon sun, photorealistic people, blurry, low resolution, extra limbs
```

---

## 1. Ilustraciones de las cartas de sitios (16) — `web/public/game/sites/`
Formato **retrato 3:4, 768×1024**, STYLE A. Vista desde el suelo o a baja altura, sin nave ni personas.
Son "genéricas": una carta muestra la de su tipo de terreno, y hay 2 variantes por tipo para que no se repitan.

| Archivo | Tipo de terreno (sitios mock que lo usan) | Descripción para el prompt |
|---|---|---|
| `site-rim-1.png`, `site-rim-2.png` | Borde de cráter suave (Shackleton A, Haworth, Faustini, Shoemaker, Amundsen, Sverdrup) | `Standing on the gentle rim of a huge lunar crater at the south pole, the crater interior falls into pitch-black permanent shadow, the rim crest is lit gold by a Sun barely above the horizon, Earth small and low over the far rim` (variante 2: `seen at a three-quarter angle, boulders in the foreground`) |
| `site-cliff-1.png`, `site-cliff-2.png` | Borde de cráter escarpado (Shackleton B, de Gerlache A/B, Nobile A/B) | `A steep, broken lunar crater wall dropping into darkness, jagged slopes and loose boulders, dramatic diagonal shadows, a sense of danger and steepness` (variante 2: `looking down the slope from the edge`) |
| `site-ridge-1.png`, `site-ridge-2.png` | Cresta (Connecting ridge) | `A long narrow lunar ridge connecting two crater rims, its spine lit by a grazing Sun while both sides fall into deep shadow` |
| `site-peak-1.png`, `site-peak-2.png` | Pico aislado (Peak near Shackleton) | `An isolated lunar peak catching the last sunlight like a lighthouse, everything around it in darkness, long shadow stretching across the plain` |
| `site-massif-1.png`, `site-massif-2.png` | Macizo (Malapert, de Gerlache–Kocher) | `A massive rounded lunar mountain massif, broad sunlit shoulder, gentle summit slopes, Earth hanging just above the horizon` |
| `site-mons-1.png`, `site-mons-2.png` | Montaña de cima plana (Mons Mouton) | `A broad flat-topped lunar mountain, wide smooth summit plateau lit by a low Sun, a few small craters, vast view to the horizon` |
| `site-plateau-1.png`, `site-plateau-2.png` | Meseta / llanura alta (Leibnitz beta, Plain at 81°S, Slater plain) | `A wide, gently rolling lunar highland plain, small craters and scattered rocks, long low-angle shadows, very open and flat terrain` |
| `site-crater-1.png`, `site-crater-2.png` | Cráter interior (Cabeus B) | `Inside a lunar crater near its edge, the floor half in shadow, faint frost glitter in the darkest part suggesting water ice, steep walls around` |

## 2. Reverso de las cartas — `web/public/game/card-back.png`
Formato 3:4, 768×1024, STYLE A.
```
Ornate trading-card back design, symmetric, a glowing magenta perspective grid floor under a starfield,
a large empty circular medallion in the centre with a soft neon violet glow (leave the circle empty: the
app logo is placed there in code), thin neon pink border with corner flourishes
```

## 3. Personaje narrador "Dr. Regolith" — `web/public/game/characters/`
STYLE B, **fondo transparente**, retrato de busto 256×256, mismo personaje en todas (usa la primera como referencia).
Base: `Fictional adult scientist, friendly and slightly eccentric, white lab coat, round glasses, wild grey hair, a small Moon-rock sample in hand, bust portrait facing slightly right, RPG dialogue-portrait style`

| Archivo | Expresión |
|---|---|
| `dr-regolith-neutral.png` | `calm smile` |
| `dr-regolith-talk.png` | `mouth open mid-sentence, one hand raised explaining` |
| `dr-regolith-alarm.png` | `shocked, eyes wide, sweat drop, red alarm light on his face` |
| `dr-regolith-happy.png` | `big grin, thumbs up, small sparkles` |
| `dr-regolith-sad.png` | `disappointed, hand on forehead` |

## 4. Astronautas del modo histórico (ficticios) — `web/public/game/characters/`
STYLE B, transparente, 256×256. **Personajes inventados**, no parecidos a astronautas reales; casco con visera reflectante, sin parches ni banderas.
- `astro-veteran.png`: `fictional veteran astronaut, 1960s-style white spacesuit, helmet under the arm, confident smirk, grey moustache`
- `astro-rookie.png`: `fictional rookie astronaut, nervous smile, helmet on with visor up, retro spacesuit`
- `astro-commander.png`: `fictional mission commander, stern but kind, arms crossed, retro spacesuit`

## 5. Nave (lander) — `web/public/game/lander/`
- `lander-side.png` — STYLE B, transparente, 256×256: `Small fictional lunar lander seen from the side, four legs, gold foil body, single descent engine with a small orange flame, no markings`
- `lander-icon.png` — STYLE B, transparente, 64×64: `the same lander as a tiny top-down map icon`
- `lander-tipped.png` — STYLE B, transparente, 256×256: `the same lander tipped over on its side on rocky ground, one leg bent, dust cloud`
- `lander-frozen.png` — STYLE B, transparente, 256×256: `the same lander covered in frost, dark, icicles, blue cold glow`

## 6. Escenas de emergencia (5) — `web/public/game/emergencies/`
Formato apaisado 16:9, 1280×720, STYLE A con tono rojo de alarma: añade `red emergency lighting, alarm atmosphere, tension`.
Vista exterior de la nave en órbita lunar baja, la Luna gris debajo.

| Archivo | Descripción |
|---|---|
| `emergency-propulsion.png` | `the lander's descent engine sputtering with broken flames and sparks` |
| `emergency-solar-storm.png` | `a violent solar storm, bright particle streaks and glowing aurora-like bands hitting the spacecraft` |
| `emergency-guidance.png` | `inside the cockpit, retro CRT screens glitching with red static, warning lights` |
| `emergency-fuel-leak.png` | `a stream of glittering fuel vapour venting from a cracked tank into space` |
| `emergency-comms.png` | `the antenna dish bent, signal waves breaking into static, Earth tiny and distant` |

## 7. Escenas de veredicto — `web/public/game/verdicts/`
Formato 16:9, 1280×720, STYLE A.

| Archivo | Cuándo | Descripción |
|---|---|---|
| `win.png` | Victoria | `the lander standing proudly on a sunlit crater rim, Earth above the horizon, neon fireworks-like glow in the sky, triumphant` |
| `lose-slope.png` | Pendiente | `the lander tipped over on a steep slope, dust settling` |
| `lose-cold.png` | Frío (noche larga) | `the lander frozen in total darkness, frost, only starlight` |
| `lose-blackout.png` | Sin Tierra | `the lander alone, Earth hidden behind a mountain on the horizon, broken radio waves` |
| `lose-low-sun.png` | Poco Sol | `solar panels in shadow, a dim Sun hidden behind the crater rim, battery icon shape made of light running empty` |
| `lose-low-comm.png` | Poca comunicación | `antenna pointing at an empty horizon, weak flickering signal` |
| `timeout.png` | Se acaba el tiempo | `the lander streaking across the sky in a dramatic out-of-control arc above the Moon, red alarm glow` |

## 8. Menú y escenarios de fondo — `web/public/game/`
- `menu-bg.png` — 1920×1080, STYLE A: `wide panoramic lunar south pole horizon at dusk, magenta perspective grid fading into the ground, Earth rising over the mountains, deep starfield, empty space in the centre for the title`
- `mode-south-pole.png` — 3:4, 768×1024, STYLE A: `game menu tile: the lunar south pole seen from orbit, sunlit crater rims around dark shadowed craters`
- `mode-historical.png` — 3:4, 768×1024, STYLE A: `game menu tile: a retro 1960s-style lunar lander on a grey equatorial plain, Earth high in the black sky, nostalgic film-grain feel`
- `orbit-bg.png` — 1920×1080, STYLE A: `the Moon's south pole seen from low orbit, the terminator line crossing it, deep black space, a few stars`

## 9. Iconos — `web/public/game/ui/`
STYLE B, transparente, 128×128.
- `star-full.png`: `shiny gold star, glowing`
- `star-empty.png`: `the same star as a dark grey empty outline`
- `alarm.png`: `red rotating alarm beacon, glowing`

---

## Resumen: 48 imágenes
16 sitios · 1 reverso · 5 + 3 personajes · 4 de la nave · 5 de emergencias · 7 de veredictos · 4 de menú y fondos · 3 iconos.
**Mínimo para que la demo luzca (14):** `site-rim-1`, `site-cliff-1`, `site-ridge-1`, `site-massif-1`, `site-plateau-1`, `site-crater-1`,
`card-back`, `dr-regolith-talk`, `lander-side`, `win`, `lose-slope`, `lose-cold`, `lose-blackout`, `menu-bg`.
