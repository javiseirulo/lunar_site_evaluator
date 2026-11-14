# Diseño del módulo Mission (juego) — v1 del diseño

- Autor humano de la idea y de las mecánicas: @Manuelcgg165 (ver `game-module.md`, "Cómo es una partida").
- Fecha: 2026-11-14. Estado: **pendiente de visto bueno de Manuel**. Issue: #49. Rama: `Manuelcgg165/49-mission-engine`.
- Lo marcado **[IA]** son decisiones de construcción o propuestas de la IA que Manuel puede cambiar; lo demás es lo que él describió.

## 1. Para qué
Que cualquiera entienda, jugando, por qué importa dónde se aterriza en la Luna: eliges un sitio bajo presión, ves pasar los días
y el juego te explica qué te ha hecho perder (o por qué tu sitio valía). Mismo dato que Explore, recorrido al revés.

## 2. Objetivos, no-objetivos y lo que lo estropearía
- **Objetivos:** partida completa de 2-4 minutos; veredicto determinista y explicado; didáctico; rejugable (emergencia y cartas cambian).
- **No-objetivos (por ahora):** que la emergencia cambie las reglas; multijugador; capa real de temperatura; IA generativa dentro del juego.
- **Lo estropearía:** un veredicto que no se pueda justificar con los datos; que gane siempre "la carta más verde";
  que el juego dependa de piezas ajenas sin terminar y no se pueda enseñar.

## 3. La partida (lo que describió Manuel)
1. **Entrada:** elegir *South Pole mission* o *Historical missions*; dificultad *Normal* (por defecto) / *Expert*.
2. **Intro:** un científico pixelado habla con texto letra a letra y cursor parpadeando (estilo RPG clásico). Explica que vamos al
   polo sur y por qué (hielo de agua). En modo histórico: diálogos de humor, **declarados como ficción/sátira**. Todo en inglés.
3. **Emergencia:** una de 4-5 al azar (fallo de propulsión, tormenta solar...). Alarmas rojas y cuenta atrás (~3:00).
   La emergencia es **solo ambientación**: no cambia las reglas.
4. **Cartas:** aparecen 4 cartas boca abajo con el logo, "Landing site 1…4", y se destapan una a una. Cada una: imagen
   ilustrativa + barras de calidad 0-100 (rojo oscuro → verde claro). *Normal* = parámetros resumidos; *Expert* = todos.
5. **Elección:** la carta elegida sube, las demás desaparecen, la nave viaja de su órbita de espera al sitio sobre el globo 3D.
6. **Timelapse:** el tiempo corre y **se para en el instante en que pierdes**; si no, llega al final y celebra la victoria.
7. **Veredicto:** por qué, un dato didáctico sobre el parámetro decisivo y ánimo para reintentar.
- **Cuenta atrás a cero:** pantalla "OUT OF TIME" con un desenlace catastrófico acorde a la emergencia.
- **Ganar:** el sitio elegido es apto para la misión ("Congratulations, the site you chose is fit for the mission!").
- **Modo histórico:** además dice si aterrizaste cerca del sitio real (umbral amplio). Los sitios los prepara Marta; no es urgente.

## 4. Reglas de derrota **[IA: propuesta, Manuel delegó "añade criterios"]**
Se comprueban hora a hora sobre `timeseries/<id>.json`. Los umbrales viven en `rules.json` para poder afinarlos sin tocar código.

| # | Regla | Cómo se calcula con el contrato actual | Umbral inicial | Fuente del umbral |
|---|---|---|---|---|
| R1 | **Terreno demasiado inclinado** (vuelcas al aterrizar; derrota en la hora 0) | `metrics.slope_deg` | > 10° | Requisito de pendiente de aterrizaje < 10° en material de Artemis/HLS (NTRS 20250009323 y 20240009596) |
| R2 | **Demasiado frío** (te quedas sin energía) | horas seguidas con `lit = 0` | > 50 h | Restricción de planificación de VIPER: ≤ 50 h de oscuridad (NTRS 20220008301). El "por qué" didáctico usa las temperaturas de Diviner |
| R3 | **Sin contacto con la Tierra** (ángulo de visión insuficiente) | horas seguidas con la Tierra por debajo de la elevación mínima (`earth_visible = 0`, o `earth_el < mask`) | `mask` = el que defina Javi; horas seguidas: **por decidir** | Elevación mínima: capa de Javi. Referencia: Artemis descarta sitios con < 25 % de visibilidad de la Tierra (⚠️ localizar el documento exacto) |
| R4 | **Demasiado calor** | horas seguidas con `sun_el` alto | **solo modo histórico** | Diviner: máximas ecuatoriales de 387–397 K (Williams et al. 2017) |

- **Por qué R4 no se activa en el polo sur:** allí el Sol nunca sube más de unos pocos grados sobre el horizonte (en los mocks,
  máximo 8,6°), así que el problema real es el frío, no el calor. Se dice en el veredicto como dato didáctico y la regla queda
  preparada para sitios de baja latitud (Apollo), donde sí aplica.
- **Si se incumplen varias**, la derrota es la primera que ocurre en el tiempo; esa es la que explica el veredicto.
- **Duración de la misión:** `mission_days` en `rules.json`. **Sin decidir** (9 o 14). Valor provisional 14 para poder construir.
- ⚠️ Los umbrales salen de resúmenes de búsqueda, no de la lectura completa de cada documento: verificar antes de la entrega.
- ⚠️ Con los datos **mock** y estos umbrales a 14 días solo pasan R1+R2 2 de 20 sitios (`faustini_rim`, `plain_81s`), y la Tierra
  desaparece ≥ 74 h seguidas en todos. Son datos inventados: los umbrales se reajustan cuando lleguen los reales.

## 5. Enfoques considerados
- **A. Motor puro + máquina de fases + datos en JSON (elegido).** Las reglas son una función sin interfaz:
  `(sitio, serie temporal, reglas) → { resultado, causa, hora del fallo, eventos }`. La interfaz solo reproduce ese resultado.
  Se puede probar con tests, enseñar aunque falte el 3D, y añadir cinemáticas sin tocar las reglas.
- **B. Todo dentro de los componentes de React.** Arranca más rápido, pero mezcla reglas con animaciones y no se puede testear
  el veredicto; cualquier cambio de animación puede romper quién gana. Descartado.
- **C. Motor de juegos en canvas (Phaser/Pixi).** Da el aire arcade "gratis", pero es una dependencia pesada nueva, no comparte
  el store ni el globo de Marta y no hay tiempo. Descartado.

## 6. Cómo se construye **[IA]**
Todo dentro de `web/src/game/` (carpeta de Manuel); no se toca la de nadie. Sin dependencias nuevas (`motion` y `lucide-react` ya están).

```
web/src/game/
├─ engine/     puro TS + tests (vitest)
│  ├─ simulate.ts   reglas R1-R4 hora a hora → veredicto + lista de eventos
│  ├─ deal.ts       reparte 4 sitios al azar (semilla) garantizando ≥1 que gana y ≥1 que pierde
│  ├─ bars.ts       métricas → barras 0-100
│  └─ distance.ts   distancia sobre la esfera al sitio histórico
├─ data/       rules.json · emergencies.json · dialogues.json · historical.json (cuando Marta tenga los sitios)
├─ state/      store propio del juego: fase actual, dificultad, cartas, elección, resultado
└─ ui/         una pantalla por fase + DialogueBox (texto letra a letra) · Countdown · SiteCard · QualityBar
```

- **Fases:** `menu → intro → alert → dealing → choosing → travel → timelapse → verdict` (y `timeout` desde `choosing`).
- **Con el resto de la app** solo por el store compartido: el timelapse escribe `selectedSiteId` y `currentTimeUTC`, así el globo
  de Marta (o el mapa polar 2D si aún no está) se mueve solo. Lee `sites` y `timeseries` con los helpers de `@/core`.
- **Barras:** *Normal* = Sunlight (`illum_pct`), Earth link (`earth_vis_pct`), Terrain (`slope_deg`, 0° → 100, ≥ 20° → 0).
  *Expert* = además Longest night (`max_dark_hours`) y Distance to shadowed craters (`psr_dist_km`), con el número al lado.
  Se cambian por los parámetros de Javi/Marta cuando los definan.
- **Las barras son medias del periodo; la derrota es un momento concreto.** Por eso la carta más verde no siempre gana.
- **Nombre real del sitio:** oculto en la carta ("Landing site 2"), se revela en el veredicto.
- **Timelapse:** toda la misión en ~25 s de reloj; cuenta atrás de 180 s. Ambos configurables.
- **Imágenes y sprite:** huecos en `web/public/game/` con marcador provisional; las imágenes las aporta el equipo.
- **Textos:** en inglés, en `dialogues.json` y `emergencies.json`, editables sin tocar código.

## 7. Orden de entrega (cada paso es un PR a `dev` y se puede enseñar)
1. Motor + `rules.json` + tests contra los 20 sitios mock.
2. Bucle jugable: emergencia + cuenta atrás → cartas → elección → timelapse → veredicto → reintentar (modo polo sur).
3. Espectáculo: intro con diálogo pixel, alarmas, viaje de la nave, pantalla de victoria.
4. Modo histórico (cuando Marta tenga los sitios y sus series) y dificultad Expert afinada.

## 8. Pendiente de Manuel
- Duración: 9 o 14 días. Se decidirá más adelante según la duración típica de este tipo de misión y cuánto complica el juego.
- ~~R3: cuántas horas seguidas sin Tierra hacen perder.~~ → lo define Javi (ver §9).
- Visto bueno a R1 (pendiente) como criterio añadido y a los umbrales iniciales.
- ¿Varios ganadores en una misma mano o uno solo? (ver §9.4).

## 9. Alineación con el plan de Javi (`docs/10-plan-tecnico.md` §5 Javi, PR #64, 2026-11-14 18:05)
Javi cerró con el equipo cómo deben funcionar los escenarios de Mission. **Manda sobre §4 y §6 donde choquen.**

1. **Una sola fuente de verdad para "¿es válido?"**: el veredicto usa la función de validez de `@/scoring` (`web/src/scoring/`,
   de Javi), la misma que Explore, con `valid` + `reasons` con margen ("noche máxima 142 h > 48 h"). Mission **no** tiene
   umbrales propios: `rules.json` desaparece y los umbrales salen de `missionConfig` (5º campo del store) + `requirements` del escenario.
   - **Lo que añade Mission encima:** el *momento* del fallo (hora en la que se rompe cada requisito) para parar el timelapse.
     Se calcula sobre la misma `Timeseries` y los mismos umbrales; un test comprueba que gana/pierde coincide con `@/scoring`.
2. **Umbrales por defecto (J9 de Javi)** sustituyen a los de §4: pendiente máx. **8°**; noche más larga umbral **100 h**
   (objetivo 24 h); comunicaciones **50 %** (objetivo 95 %); **blackout máx. 72 h** (objetivo 12 h); margen de antena **2°**;
   `surface_days` por defecto **7** ("del orden de Artemis III, ~6,5 días") — dato útil para cerrar la duración.
   R3 (Tierra) = `max_blackout_hours` con la Tierra por encima de horizonte + 2°. R4 (calor) no está en el plan de Javi: queda solo para el modo histórico.
3. **Formato de escenario:** `web/src/game/scenarios/<id>.json` = `MissionConfig` + campos de juego (`title`, `briefing`, `site_ids`,
   `surface_days`, `requirements`, `start_in_orbit`, `orbit_plane_lon_deg`, `goal: reach_valid_site`, `variant`).
   Llegada con `computeArrival(config, site)` de `@/scoring` → fases lanzamiento/llegada/espera en órbita/aterrizaje: es justo
   lo que necesita la cinemática "la nave va de su espera al sitio".
   - Encaje con lo de Manuel: la **emergencia** al azar = `title`/`briefing`; las 4 cartas = `site_ids` barajados al azar.
   - ⚠️ `variant: professional | student` de Javi ≠ los dos estilos de Manuel (polo sur / histórico) + dificultad (normal / expert).
     Propuesta: `variant` = dificultad (student ≈ normal, professional ≈ expert) y el estilo va en un campo `style: south_pole | historical`.
4. **Varios ganadores:** con `@/scoring` cada sitio tiene `score` además de `valid`. Propuesta: pueden ganar varios sitios
   (es realista: hay varios aptos), y el veredicto de victoria muestra 1-3 estrellas según el score. Decide Manuel.
5. **Barras de las cartas:** el PR #63 (abierto, de Javi2) trae `web/src/core/metrics.ts` con nombres para estudiante
   ("Sunlight", "Earth view", "Longest dark", "Slope"…), ayuda y escala 0-1, y un interruptor global **Pro mode**.
   Las cartas los reutilizan; *Expert* puede apoyarse en Pro mode en vez de tener un selector propio.

### Dependencias y riesgo de plazos
| Necesito | Dueño | Estado (14-nov 18:05) | Mientras tanto |
|---|---|---|---|
| `@/scoring` (validez + score) y `computeArrival` | Javi | plan escrito; llega "15-nov a mediodía" | adaptador en `game/` con la misma forma, sobre los mocks; se cambia la importación cuando exista |
| `missionConfig` en el store + tipo `MissionConfig` | Javi/Javi2 (contrato v1.1) | "14-nov por la noche" | tipo local provisional con los mismos campos |
| Métricas v1.1 (`max_blackout_hours`, `sun_el_mean_deg`, `sun_earth_pct`) | Javi | opcionales en v1.1 | se calculan en el cliente desde la `Timeseries` |
| `metrics.ts` y Pro mode | Javi2 | PR #63 abierto y en conflicto | barras propias simples, se cambian al mergear |
| Freeze del equipo | — | 15-nov ~18:00 | — |

### Para debatir con el equipo
- **Pendiente máxima:** hay tres valores en el repo: 8° (Javi, J9), 15° (texto de ayuda de `metrics.ts` en PR #63) y 10° (mi §4,
  requisito de aterrizaje de Artemis/HLS). Debe haber uno solo.
- **Nombres `variant`:** acordar con Javi cómo se llaman los dos estilos y las dos dificultades en el formato de escenario.
