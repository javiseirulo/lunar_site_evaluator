# Mission — estado, dudas y límites (2026-11-14, noche)

Rama `Manuelcgg165/49-mission-engine` en el fork `Manuelcgg165/lunar_site_evaluator`, rebasada sobre el `dev` del fork (que trae el globo 3D v0, #71) y subida al fork. Plan: `docs/superpowers/plans/2026-11-14-mission-module.md`.
114 tests, typecheck, lint, prettier y build en verde. **Sin probar en navegador desde la Task 5** (esta sesión fue en la nube y sin navegador).

## Hecho
| Task | Qué | Estado |
|---|---|---|
| 1 | Motor: veredicto, hora del fallo, estrellas | ✅ revisado |
| 2 | Reparto con semilla (4 cartas, ≥1 gana y ≥1 pierde) + barras 0-100 | ✅ revisado |
| 3 | Store de fases + textos en `web/src/game/content/` | ✅ revisado |
| 4 | Bucle jugable: menú, alerta + cuenta atrás 3:00, cartas, veredicto, timeout | ✅ revisado |
| 5 | Viaje + timelapse que se para en la hora del fallo, HUD | ✅ re-revisado: la regla de noche y enlace vive solo en `engine/simulate.ts` (`hourlyFlags`/`isLinkUp`), `simulate.test.ts` no cambió y hay un test con `earth_visible` corto |
| 6 | Intro: Dr. Regolith en pixel art (SVG 16×16 o `dr-regolith-talk.png`) + `DialogueBox` reutilizable (35 car/s, cursor de bloque, clic/Enter/Espacio, Skip, respeta reduced motion) | ✅ hecho, **falta probarlo en el navegador** |
| — | Revisión final + una ronda de arreglos | ✅ (ver abajo) |

## Sesión 2026-11-14 noche (nube)
- Rebase sobre `dev` (#71). Solo hubo conflictos append-only en `docs/decisions/log.md` y `docs/si-usage-log.md`; se conservaron los dos lados.
- **Globo 3D descartado por ahora; se queda PolarMap.** Al seleccionar un sitio, `GlobeCanvas` abre la `GlobeCard` con el nombre real y el score, y además muestra el formulario de pines. Ocultarlo exigiría CSS frágil sobre el overlay de R3F o tocar `src/globe` (que es de Marta). Para usarlo, Marta tendría que exponer una prop tipo `hideLabels`/`readOnly` en `GlobeView`.
- Arreglos de la revisión final:
  - `utility()` ya no da NaN cuando el umbral es igual al objetivo.
  - Test de las fronteras de estrellas (1/3 y 2/3).
  - El test de `deal` sin series ahora comprueba algo de verdad.
  - El veredicto muestra el límite y la hora del fallo ("Night lasted over 100 h (failed at hour 100)") en vez de la racha más larga de toda la ventana.
  - Las ayudas de dificultad del menú salen de `BAR_LABELS`, que tiene un test contra `qualityBars`.
  - `useDealHand` muestra un error de carga si falla una serie y tiene `.catch`.
  - `TimelapseScreen`:
    - espera a que la serie esté cargada;
    - no repite la reproducción si cambia una dependencia al final;
    - `finish()` tiene guard;
    - al ganar muestra "Hour 168 of 168".
  - Se quitó el `#slot` repetido en la carta.
  - `replaceAll` en `verdictImage`.
  - Se corrigió el comentario obsoleto de `MissionMap`.

## Qué probar a mano en el navegador (`pnpm dev` → `/game`)
1. **Intro:**
   - Menú → South Pole: aparece Dr. Regolith balanceándose y el texto se escribe letra a letra con el cursor parpadeando.
   - Clic, Enter o Espacio a mitad de una línea la completa; otro clic pasa a la siguiente.
   - Tras la última línea se pasa a la alerta.
   - Skip salta directamente a la alerta.
   - Con "reducir movimiento" activado en el sistema, las líneas aparecen enteras.
   - El cuadro no cambia de altura mientras escribe.
2. **Timelapse:**
   - Arranca, avanza unos 25 s y se para en la hora del fallo; el texto coincide con el del veredicto.
   - Al ganar acaba en "Hour 168 of 168".
   - Skip va al final.
   - En el mapa no se ve el nombre del sitio, ni al pasar el ratón.
3. **Veredicto:** el texto de detalle nuevo ("… lasted over N h (failed at hour H)").
4. **Carta:** sin `#N` en la cabecera.

## Pendiente / no arreglado
- **MissionMap oculta los nombres con un selector CSS** (`[&_button>span:last-child]:hidden`) que depende del marcado de PolarMap y no tiene test: en vitest no hay DOM. Si Javi2 cambia PolarMap, podría verse el nombre. La solución buena es una prop `hideLabels` en PolarMap (fuera de nuestro ámbito).
- **La cuenta atrás corre mientras se cargan los datos** y se reparten las cartas (unos 4 s). Se deja así a propósito; ver dudas.
- Si la serie del sitio elegido no cargara nunca, el timelapse se quedaría esperando. No debería pasar: el reparto solo da cartas con serie cargada.
- Imágenes: no existe ninguna aún; salen marcadores. Las prioritarias están en `mission-image-prompts.md` (`card-back`, `dr-regolith-talk`, `lander-side`, `win`, `lose-*`, `menu-bg`).
- Modo histórico: fuera de este plan. `DialogueBox` ya está lista para reutilizarse.

## Dudas para decidir contigo
- **Duración de la misión:** provisional 7 días (valor por defecto de Javi). ¿7, 9 o 14?
- **`computeArrival` de `@/scoring`:** ¿enganchamos el viaje a sus fases reales o lo dejamos como animación simple?
- **El juego sale difícil con los mocks:** solo hay sitios aptos aterrizando entre el día 6 y el 22 de la ventana. Reajustar con los datos reales.
- **Barras vs. resultado:** las barras son medias de todo el periodo y la derrota es un momento concreto. ¿Lo explicamos en la lección?
- **Cuenta atrás:** ¿que arranque al terminar el reparto en vez de durante la carga?
- **Globo 3D:** ¿le pedimos a Marta una prop `readOnly`/`hideLabels` en `GlobeView` para usarlo en el timelapse?

## Límites encontrados
- La página `/game` no tiene la barra de tiempo, así que el reloj compartido solo se ve moverse en otras pestañas.
- PolarMap no sigue `currentTimeUTC`: el mapa del timelapse es estático y el HUD es lo que cambia.
- OneDrive a veces bloquea `.git` durante los rebases (hay que borrar `.git/rebase-merge` a mano).
