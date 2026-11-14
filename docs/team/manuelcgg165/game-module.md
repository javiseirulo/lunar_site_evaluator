# Módulo Mission (juego) — Cristóbal

- Autor humano: @Manuelcgg165 y equipo. Fecha: 2026-11-14.
- Origen: humano. Sale de la conversación grabada del equipo; la IA solo ha redactado y estructurado este resumen.
- Estado: descripción a priori. Puede ajustarse si aparecen limitaciones técnicas; cualquier cambio se anotará aquí y en `docs/decisions/log.md`.

## Qué es
Se mantiene la decisión del equipo (ver `docs/ideas/javiseirulo-explore-mission.md`): alerta tipo Mission Control
("no podemos aterrizar donde estaba previsto"), pocos requisitos, 4-5 sitios con sus parámetros sin indicar cuál es mejor,
el jugador elige uno, se simulan N días y el veredicto explica por qué salió bien o mal ("sin visibilidad de la Tierra",
"te quedaste sin Sol"), con opción de reintentar. Dos variantes: modo profesional y modo estudiante (jugador único o clase).
Sin multijugador. Esta descripción sustituye a la lista anterior de mecánicas (logros, quiz, ranking).

## Cómo se construye
- Carpeta: `web/src/game/`. TypeScript sobre el store compartido, con tests en vitest.
- Consume: `sites.json` (métricas por sitio), `timeseries/<id>.json` (`t_utc`, `sun_el`, `earth_el`, `lit`) y los campos
  del store `selectedSiteId`, `currentTimeUTC` y `mode: "game"`.
- No depende del 3D ni del cálculo real: se desarrolla en paralelo con mocks que respetan los contratos.
- Veredicto determinista, calculado a partir de la serie temporal (sin IA dentro del producto).

## Qué necesito de los demás
- Contratos de `sites.json` y `timeseries` estables; aviso si cambian.
- Series temporales horarias que cubran toda la ventana simulada para los sitios del escenario.

## Iteraciones
- v0: motor de simulación y veredicto con datos mock y tests.
- v1: interfaz (alerta, tarjetas de sitios, simulación, veredicto, reintentar).
- v2: datos reales e integración con el globo y la ficha de sitio.
- v3: modo estudiante y pulido.

## Pendiente de cerrar
- Reglas de victoria y derrota.
- Duración de la simulación (se habló de 9 o 14 días).
- Qué diferencia el modo profesional del modo estudiante.