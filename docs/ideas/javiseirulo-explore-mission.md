# Idea: Explore + Mission — un solo pipeline, dos direcciones ("el Booking de la Luna")

- Autor humano: @javiseirulo y compañeros de equipo (tormenta de ideas hablada, 2026-11-14)
- Fecha: 2026-11-14
- Origen de la idea: **humano**. Surge de la conversación del equipo (transcrita por javiseirulo en el chat de la sesión). Claude solo la estructuró y le hizo preguntas de estrés; no aportó el concepto. Ver `docs/si-usage-log.md`.
- Estado: borrador v1 (sin validar con /office-hours Phase 3-4 ni plan-reviews).

## Usuario y problema
"Cualquier persona": suficientemente sencillo para familia/escolares; con modo avanzado para quien quiera profundizar.
Problema del reto: entender el entorno de **luz (energía)** y **comunicación (Tierra visible)** de un sitio de aterrizaje en el polo sur lunar,
y reconsiderar rápido fecha y lugar. Quickmap / Moon Trek / Horizons son demasiado complejos.

## Qué construimos
Un único **pipeline de cálculo** (Sol/Tierra sobre el horizonte con terreno, a lo largo del tiempo, + capas de contexto) usado en dos direcciones:

1. **Explore (A→B: requisitos → sitios).** Estética tipo Booking/Idealista: a la izquierda filtros y sliders (pocos, muy intuitivos:
   iluminación solar, visibilidad de la Tierra, planitud/altitud) + barra temporal; a la derecha globo/mapa lunar 3D que se actualiza en vivo con los
   sitios que cumplen y un **top 5 numerado**. Al pulsar un sitio: ficha (por qué es bueno) + vista de horizonte 360° con Sol y Tierra.
   Botón *Advanced settings*: más sliders/desplegables (link budget, SNR, etc.) para búsqueda "a medida"; la parte derecha es la misma.
   Capas opcionales: "barrios" lunares con nombre (regiones nombradas, estética pastel, family-friendly) y misiones históricas (botón tipo reloj, puntos en el mapa).
2. **Mission / juego (B→A: sitio → resultado).** Alerta tipo Mission Control ("no podemos aterrizar donde estaba previsto"): pocos requisitos, 4-5 sitios con sus parámetros
   (sin decir cuál es mejor), eliges, se simula el tiempo (p. ej. 9 o 14 días) y el veredicto explica **por qué** ("sin visibilidad de la Tierra", "te quedaste sin Sol") + *retry*.
   Mismo backend que Explore, recorrido al revés. Opción: el modo juego recrea una misión histórica.
   **Decisión (2ª conversación, 2026-11-14):** el público objetivo principal es el **técnico/profesional** (no profesores). Mission tiene dos variantes:
   *Modo misión profesional* (entrenamiento/decisión rápida tipo Mission Control) y *Modo estudiante* (jugador único, o una clase usando el mismo escenario; un botón lo activa).
   **Sin multijugador tipo Kahoot** (no da tiempo, ni encaja con el target).
   **Prioridad: 1º Explore, 2º Mission.** Mission no se empieza hasta que Explore funcione.

## Frase de una línea (borrador a pulir por el equipo)
"Elige dónde aterrizar en la Luna con sliders, y descubre —simulando los días siguientes— si hiciste buena elección y por qué."

## Diferencial frente a Quickmap / Moon Trek / Horizons
- Simplicidad "Apple" + doble público (escuela/familia ↔ profesional con filtros avanzados).
- Dirección inversa: no preguntas "qué hay aquí", sino "dónde cumple lo que necesito" (y el juego: "elegí aquí, ¿qué pasó?").
- Educativo: cada veredicto explica el motivo.
- Nota de prior art: LunaMission (Softsasi) va a "aerospace-grade" (ray-marching LOLA 20 m, DSN link budget, 5 workspaces). La corrección científica es requisito mínimo; nuestro espacio libre es la experiencia.

## Datos NASA que usa y cómo
- LOLA LDEM (5 m en sitios del polo sur de Barker et al.; 20 m/60 m/118 m resto): horizonte, pendientes, planitud.
- JPL Horizons / SPICE: posiciones de Sol y Tierra y libración → visibilidad en el tiempo.
- Capas de contexto: por verificar (ver riesgos) — nada se incluye sin fuente y versión.

## Cómo lo validamos científicamente
Contrastar visibilidad Sol/Tierra de puntos de prueba con Horizons web, y la iluminación con mapas publicados (Barker/LPI). Anotar en cada PR de cálculo.

## Alcance mínimo para el demo (≤ 1 día) — recorte propuesto (decide el equipo)
- **Núcleo (sí o sí):** precompute del polo sur → Explore con 2-3 sliders + barra temporal + top 5 + ficha de sitio con horizonte 360° Sol/Tierra.
- **Capa fina:** modo juego mínimo (3-4 sitios, simulación N días, veredicto con motivo determinista).
- **Si sobra tiempo:** misiones históricas (lista estática), nombres de "barrios", modo avanzado.
- **V2 / fuera:** chatbot con Gemini (open text), Genie 3 / generativo, capa de minerales, dificultad pro del juego.

## Riesgos / lo que no sabemos
1. **Sliders en vivo ⇒ hay que precalcular** rasters/tiles (iluminación y visibilidad Tierra por celda y ventana temporal). Ray-marching por clic no escala. Decisión técnica clave: resolución de malla, rango de fechas, paso temporal.
2. **"Street View lunar"**: no existe fotografía; sería una vista sintética del DEM (5 m solo en sitios Barker; 20 m+ fuera). Etiquetar como "vista derivada del terreno". Versión barata: cinta de horizonte 360° (ya acordado como límite).
3. **"Datos del clima"**: en la Luna no hay clima. Meteomatics (Global Offers) es meteorología **de la Tierra** → no aplica. Si se refería a temperatura, es otro dataset (por buscar).
4. **Minerales/recursos**: hay que localizar fuente verificable antes de prometerlo (Validity). Hasta entonces, no se incluye.
5. **Chatbot Gemini**: es SI dentro del producto → declarar en el formulario; coste/límites de API; mejor explicaciones deterministas (más válidas y reproducibles).
6. **Alcance**: son ~5 productos en 24 h con demo de ≤30 s. Sin recorte pierde Presentation y Validity.
7. **Juego**: ¿qué habilidad? Propuesta del equipo: el jugador debe hacer coincidir los requisitos con los parámetros; el "truco" es temporal (un sitio bueno el día 1 pierde Tierra/Sol el día 9). Falta cerrar reglas de victoria.

## Encaje con criterios y premios objetivo
Presentation y Creativity fuertes si el demo se entiende en 30 s; Validity depende del pipeline y la validación con Horizons.
Premios candidatos: Most Inspirational, Best Storytelling, Art & Technology, Best Use of Data/Technology.

## Historia del demo en 30 s (por definir por el equipo)
**Formato decidido: ≤7 diapositivas** (no vídeo de 30 s: el equipo cree que 30 s se queda corto para varias features), con capturas de cada feature y explicación oral rápida.
Jugar en vivo con el jurado (estilo Kahoot) descartado: tarda demasiado entre conectarse y jugar. Alternativa barata a valorar: enlace/QR público en la última diapositiva para que lo prueben después.
Pistas del equipo: no arrancar con "la Luna girando" (todos lo harán); mostrar el desplegable de objetivos ya abierto; slider → mapa cambia en vivo → pulsar sitio → horizonte 360°.
Esquema borrador de las 7 diapositivas en `docs/07-mvp-plan.md`.

## Reparto modular propuesto (para trabajar en paralelo)
Contratos de datos claros entre módulos: (a) pipeline/precompute · (b) API de scoring/filtrado · (c) globo+filtros UI · (d) ficha de sitio + horizonte 360° · (e) motor del juego · (f) demo/docs/referencias.
