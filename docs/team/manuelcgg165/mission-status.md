# Mission — estado, dudas y límites (pausa 2026-11-14, tarde)

Rama `Manuelcgg165/49-mission-engine` (commits locales, **sin push**). Plan: `docs/superpowers/plans/2026-11-14-mission-module.md`.
86 tests, typecheck, lint, prettier y build en verde. Probado en navegador hasta la Task 5.

## Hecho
| Task | Qué | Estado |
|---|---|---|
| 1 | Motor: veredicto, hora del fallo, estrellas | ✅ revisado |
| 2 | Reparto con semilla (4 cartas, ≥1 gana y ≥1 pierde) + barras 0-100 | ✅ revisado |
| 3 | Store de fases + textos (emergencias, intro, lecciones) en `web/src/game/content/` | ✅ revisado (se movió de `data/` porque el `.gitignore` del repo ignora cualquier `data/`) |
| 4 | Bucle jugable: menú, alerta + cuenta atrás 3:00, cartas, veredicto, timeout | ✅ revisado (corregido: una elección en el último segundo ya no acaba en OUT OF TIME) |
| 5 | Viaje + timelapse que se para en la hora del fallo, HUD | ⏳ corrección hecha (reglas de noche/enlace en un solo sitio); **falta la re-revisión** |

## Pendiente
1. Re-revisión de la corrección de la Task 5.
2. Task 6: intro con el científico pixel (texto letra a letra, saltable). Hoy la intro se salta sola.
3. Revisión final de toda la rama + una ronda de arreglos.

## Dudas para decidir contigo
- **Duración de la misión:** provisional 7 días (valor por defecto de Javi). ¿7, 9 o 14?
- **`computeArrival` de `@/scoring`** ya existe en `dev`: ¿enganchamos el viaje de la nave a sus fases reales (lanzamiento → órbita → espera → aterrizaje) o lo dejamos como animación simple?
- **El juego sale difícil con los mocks:** con las reglas de Javi solo hay sitios aptos aterrizando entre el día 6 y el 22 de la ventana. Reajustar cuando lleguen los datos reales.
- **Barras vs. resultado:** las barras son medias de todo el periodo y la derrota es un momento concreto; puede pasar que la carta diga 59 % de Sol y la misión tenga 100 %. Es intencionado (es el "truco"), pero quizá convenga explicarlo en la lección.
- **El texto del veredicto** da la racha más larga de la ventana ("blackout 117 h > 72 h") aunque fallaste en la hora 72. ¿Mostrar la racha que te hizo perder?
- **Cuenta atrás:** empieza mientras se cargan los datos y se reparten las cartas (~4 s). ¿Que arranque al terminar el reparto?

## Límites encontrados
- **Imágenes:** ninguna existe aún; el juego muestra marcadores y las carga solas en cuanto estén en `web/public/game/` con los nombres de `mission-image-prompts.md`.
- **Globo 3D:** el timelapse usa el mapa polar 2D; cambiar al globo de Marta es una línea (`ui/MissionMap.tsx`).
- **Nombres ocultos en el mapa:** se esconden con una regla CSS que depende del marcado del mapa polar; si Javi2 lo cambia, podría verse el nombre.
- **La página `/game` no tiene la barra de tiempo**, así que el reloj compartido solo se ve moverse en otras pestañas.
- **OneDrive** bloquea a veces `.git` durante rebases (hay que borrar `.git/rebase-merge` a mano).
- **Modo histórico:** fuera de este plan; depende de los sitios de Marta.

## Mejoras menores apuntadas para la revisión final
NaN si un umbral = objetivo; fronteras de 1 y 2 estrellas sin test; error de carga de series muestra "No valid mission"; sin `.catch` si el reparto falla; etiqueta `#slot` repetida en la carta; textos de ayuda del menú escritos a mano; en la victoria el timelapse acaba en "Hour 167 of 168".
