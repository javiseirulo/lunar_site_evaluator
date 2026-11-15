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

## Avances (2026-11-14, 2ª ronda) — palabras de @Manuelcgg165
- **Reglas de victoria/derrota:** "hay que pensarlas bien". Candidatas que propone Manuel:
  - Quedarse **demasiado frío o demasiado caliente**. ⚠️ Hay que corroborar con una fuente el rango de temperaturas
    alcanzables en la superficie lunar antes de usarlo (posible dataset: LRO Diviner, por verificar).
  - **No tener ángulo de visión suficiente**, tipo elevación mínima sobre el horizonte. La capa de elevación mínima la hace **Javi**.
- **Duración (9 o 14 días):** sin decidir; Manuel quiere hablarlo con calma.
- **Estilos de juego** (sustituye a la pregunta "profesional vs. estudiante", aún por encajar con esos nombres):
  1. Misión con las reglas de victoria/derrota.
  2. **Recrear misiones históricas**: además de las reglas, el veredicto dice si elegiste el mismo sitio que se eligió
     históricamente, con un umbral de cercanía **bastante amplio**.
- Siguiente paso: describir entera cómo se imagina una partida antes de redactar los módulos.
- Issues: #49 actualizado al plan vigente (`web/src/game/`, base `dev`) y asignado a Manuel. #48 (catálogo curado) es de Javi.
  #50 (entrega) queda sin dueño por ahora.
## Cómo es una partida (2026-11-14, 3ª ronda) — descrita por @Manuelcgg165
> Origen humano: lo que sigue es la descripción de Manuel, ordenada por la IA sin añadir mecánicas. Lo marcado ⚠️ son
> avisos de la IA (reglas del concurso, dependencias, datos que faltan), no decisiones.

1. **Pantalla de entrada al módulo:** eliges entre **modo misión polo sur** y **modo misiones históricas**. Hay un selector de
   **dificultad** con dos niveles, *normal* (por defecto) y *expert*.
2. **Introducción (cinemática de diálogo):** estilo Pokémon / Profesor Layton: aparece un científico, el texto se escribe letra a
   letra con cursor parpadeando. Explica que la misión va al polo sur y por qué interesa (agua congelada). Un punto de fantasía y
   estética *classic gaming*, respetando la estética general del proyecto.
   - En **misiones históricas** (no tienen por qué ser del polo sur): información real de astronautas y diálogos con humor
     al inicio, para dar contexto histórico de forma entretenida.
3. **Emergencia:** cada partida empieza con una emergencia ficticia al azar (unas 4-5: fallo de propulsión, tormenta solar...).
   Saltan alarmas rojas llamativas y arranca una **cuenta atrás** (unos 3 minutos, por ejemplo).
4. **Elección de sitio con cartas:** aparecen una tras otra hasta 4 cartas ("Landing site 1, 2..."), boca abajo con el logo de la
   página; cuando están las cuatro se destapan en secuencia. Cada carta lleva imágenes genéricas de cómo podría verse un sitio
   lunar (generadas por IA) y **barras de calidad 0-100** por parámetro (0 = rojo oscuro, 100 = verde claro).
   - *Normal*: parámetros "simples" o resumidos. *Expert*: los parámetros del modo avanzado de Explore, para que decidir cueste más.
   - Qué parámetros se muestran depende de cómo los definan Javi y Marta; la puntuación usa los pesos del algoritmo de Javi.
5. **Al elegir:** la carta elegida sube, las demás desaparecen y empieza la simulación: la nave va desde su posición de espera
   hasta el sitio, sobre la esfera 3D de la Luna, con una cinemática simpática del alunizaje.
6. **Timelapse:** el tiempo avanza y **se detiene justo cuando pierdes**; si no pierdes, sigue hasta el final y te anuncia la
   victoria de forma espectacular.
7. **Veredicto:** explica brevemente por qué has perdido, enseña algo didáctico sobre el parámetro que más ha pesado y te anima
   a reintentar.
- **Formas de perder:** demasiado frío, demasiado calor, ángulo de visión insuficiente (capa de elevación mínima, de Javi).
  Manuel delega en la IA proponer más criterios según lo que añada Javi; se presentarán como propuesta para que él decida.
- **Modo histórico:** además de esas reglas, dice si elegiste el mismo sitio que la misión real (umbral de cercanía amplio).
- **Referencia estética aportada por Manuel:** ilustración synthwave (cielo negro estrellado, rejilla magenta en perspectiva,
  neones morado/naranja). Solo como inspiración de ambiente; no se copia ni se incluye en el repo (es arte de terceros).

### ⚠️ Avisos de la IA sobre esta descripción (para decidir)
- **Alcance del equipo:** el issue #51 deja fuera del MVP "cinemática de cámara" y "capa de misiones históricas", y la prioridad
  acordada es 1º Explore, 2º Mission. Entrega: domingo 15 nov 23:59.
- **Estética:** la decisión vigente de @javocruz es "portal científico de los 2000" (azul marino, Verdana, esquinas rectas,
  acento naranja), no synthwave. Si Mission lleva otra piel hay que acordarlo con él.
- **Temperatura:** el contrato de datos no tiene temperatura (`illum_pct`, `earth_vis_pct`, `slope_deg`, `max_dark_hours`,
  `psr_dist_km` + series `sun_el`, `earth_el`, `lit`, `earth_visible`). Hace falta una fuente (p. ej. LRO Diviner, por verificar)
  o derivar la regla de las horas de luz/oscuridad.
- **Misiones históricas:** las series temporales solo cubren el polo sur; sitios como los Apollo necesitarían datos de Javi.
- **Imágenes generadas por IA:** marca de agua visible obligatoria y etiqueta de "ilustrativa"; sin logos, insignias ni
  identificadores de misión. Citas de astronautas reales: solo con fuente; el humor inventado no se pone en boca de personas reales.
- **Simulación en la esfera 3D:** depende del globo de Marta (hoy placeholder); el mapa polar 2D ya existe como respaldo.

## Decisiones de Manuel (2026-11-14, 4ª ronda)
- Cinemática y misiones históricas **dentro** del alcance (lo de #51 fue un malentendido). Sitios históricos: Marta, sin urgencia.
- Estética: se ajusta más adelante; no bloquea. El globo 3D de Marta está cerca de terminar.
- Diálogos con astronautas: ficción humorística declarada como sátira; idioma inglés.
- Emergencia: solo ambientación por ahora. Cuenta atrás a cero: "ran out of time" + evento catastrófico ligado a la emergencia.
- Temperatura: derivada de los datos que ya hay (frío = horas seguidas sin Sol; calor = Sol alto mucho tiempo). Capa real descartada.
- Ganar: llegar a un sitio apto para la misión, con mensaje de enhorabuena.
- El registro de uso de IA lo lleva el equipo en persona.
- Diseño completo para aprobar: `mission-design.md`.
