# 03 — Reto: Lunar Landing Site Navigator

URL: https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/
Dificultad: Intermedia/Avanzada · Temas: Human Exploration, Moon, Software, Space Exploration.
(Contenido parafraseado; leer la página original para el texto oficial.)

## Problema
Las misiones al polo sur lunar (CLPS y otras) sufren iluminación y comunicación extremas. La posición del **Sol**
determina energía solar y térmica; la de la **Tierra** determina si hay enlace directo sin relés. Herramientas
(Quickmap, Moon Trek, JPL Horizons) existen pero son complejas para comparar escenarios rápido. Las misiones
cambian de fecha/lugar por retrasos → hay que reevaluar sitios alternativos o fechas alternativas **rápidamente**.

## Objetivo
Crear una herramienta/app intuitiva para que **planificadores de misión, educadores y público** comparen sitios
de aterrizaje y fechas, visualizando Sol y Tierra respecto al horizonte para evaluar **potencial de energía** y
**ventanas de comunicación directa con la Tierra**.

## Posibles componentes (todos opcionales)
- Selección/comparación de sitios: lista curada (Apollo, CLPS, comerciales, otros países) + coordenadas personalizadas; comparación lado a lado.
- Flexibilidad de fecha/hora; explorar días/estaciones lunares.
- Visualización de posición de Sol y Tierra sobre el horizonte; **tiempo restante hasta puesta de Sol / Tierra**.
- Métricas: elevación solar, duración de luz solar, ventanas de visibilidad de la Tierra.
- Visualizaciones 2D / 3D / otras.
- Dinámica temporal: animaciones o líneas de tiempo de un día lunar o varios.
- Accesibilidad: del experto al público general; formato libre (web, móvil, visualización interactiva, juego educativo...).

## Consideraciones técnicas citadas por el reto
- Efemérides: JPL Horizons o datasets precalculados.
- Topografía LOLA para horizonte realista y visualización.
- **Sin atmósfera → sin refracción**: el horizonte lo da el terreno local y el limbo esférico lunar.
- La elevación solar es la métrica clave de energía.
- Considerar **libración** de la Tierra (balanceo) y variaciones orbitales lunares.
- Terreno del polo sur: pendientes pronunciadas, cráteres profundos, sombras extremas.
- UX: comparación rápida de escenarios; comunicar claramente el tiempo hasta Sunset/Earthset; hacer evidente por qué pequeños cambios de lugar/fecha tienen gran impacto.

## Recursos oficiales del reto (pestaña Resources)
- Quickmap (LROC/ASU): https://quickmap.lroc.asu.edu/
- Moon Trek (NASA): https://trek.nasa.gov/moon/
- JPL Horizons: https://ssd.jpl.nasa.gov/horizons/
- CSA Moon Exploration: https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/

## Qué evalúa el jurado en ESTE reto (interpretación)
- **Validity** pesa mucho: es un reto cuantitativo. Horizonte con terreno + efemérides correctas.
- **Relevance**: LOLA + Horizons/SPICE son los datos "núcleo" obvios.
- Diferenciación posible: foco en **reprogramación rápida** (qué cambia si muevo fecha/sitio) más que en una simple visualización.
