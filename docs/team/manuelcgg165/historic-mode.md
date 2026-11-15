# Mission — modo Historical (#114)

Idea y reglas: @Manuelcgg165 (2026-11-15). Decisiones en `docs/decisions/log.md` (misma fecha).

## Cómo funciona
- Menú → **Historical missions** → selector (por año, o aleatoria). Intro con el narrador de la misión (astronauta o nave),
  alarma solo si la misión la tuvo (escena animada existente: guidance / propulsion / fuel_leak), briefing (en calma si no
  hubo alarma), aproximación, 4 cartas, descenso, reconocimiento (Street View de Pablo, si hay token), simulación, veredicto.
- Hora de aterrizaje **fija** = la real. Cada carta muestra **"Sun at touchdown"**; el texto de la mesa da el rango de luz.
- Reglas = South Pole (7 días, mismos umbrales) + **luz de aterrizaje** (crewed 5–20°, optical 2–60°, radar sin regla) +
  repetidor en cara oculta. Estancia más corta en las misiones de muestras de 1–2 días. Causas nuevas: `dark_landing`,
  `glare_landing` (fallan en la hora 0, como la pendiente).
- Veredicto: bloque **History** (dónde aterrizó la misión real y con qué Sol) + dato curioso.

## Datos
- Contenido (textos, opciones, fuentes): `python/export/historic_missions.yaml`.
- Generador: `LUNAR_KERNELS_DIR=... python -m export.historic` → `web/public/data/historic/{missions,<id>}.json`
  (SPICE DE440 en la hora exacta; series horarias de 15 días; horizonte de terreno en las opciones polares del catálogo).
- Validación: el Sol al aterrizar reproduce los ángulos documentados de Apollo (A11 10,7° vs ~10,8°; A12 5,2° vs 5,1°;
  A14 10,3° vs 10,3°; A17 13,3° vs 13,3°). Test que cruza el motor TS con el Python en las 32 misiones.

## Pendiente
- **Retratos** de narradores: prompt en `historic-portraits-prompt.md` (mientras tanto sale Dr. Regolith).
- **19 misiones no jugables** (Surveyor, Luna 9–24, Chang'e 3–6, SLIM, IM-1, Beresheet): sus alternativas realistas ganan
  todas; harían falta datos de pendiente/rocas del lado visible o alternativas documentadas más alejadas.
- La intro de Javo (`web/src/intro/content.ts`) dice "solo 2027": las efemérides cubren ahora también 1966–2025.
