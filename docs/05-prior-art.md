# 05 — Prior art y huecos

## Herramientas oficiales (las que el reto dice que son difíciles)
- **Quickmap** — potente para imagen/topografía/iluminación; curva de aprendizaje alta; no está pensado para comparar escenarios sitio×fecha.
- **Moon Trek** — exploración 3D/mapas; no da directamente ventanas Sol/Tierra por sitio.
- **JPL Horizons** — exacto, pero interfaz de formularios y tablas crudas; sin terreno.

## Proyectos abiertos relacionados (⚠️ solo referencia, NO copiar)
- https://github.com/Softsasi/LunaMission — "AI-assisted lunar mission planning tool to compare Moon landing sites and mission dates using NASA data, solar illumination analysis, Earth..." → **parece ser otro equipo del mismo reto**. Revisarlo para saber qué enfoque verá el jurado y diferenciarnos. Copiar código sin declararlo viola las reglas de originalidad.
- Mapas de iluminación del polo sur (Mazarico et al.; LPI atlas) — resultados ya publicados contra los que **validar** nuestros números.
- Barker et al. 2021 (*Improved LOLA elevation maps for south pole landing sites*) — referencia científica clave: DEM 5 m + iluminación a 1 m sobre la superficie (Site 1 con >70 % de iluminación media en 2024–2026).

## Huecos posibles (hipótesis a pensar por humanos, ver `ideas/`)
1. Comparación **lado a lado sitio×fecha** en segundos (las herramientas actuales no lo hacen).
2. **Modo "reprogramación"**: "mi lanzamiento se retrasa N días → qué sitios alternativos siguen viables".
3. Horizonte **con terreno real** de forma accesible (la mayoría de calculadoras asumen horizonte liso).
4. Lenguaje visual para no-expertos (educación/público) manteniendo rigor para ingenieros.

> Estas son observaciones del mercado, no la idea del equipo. La idea la decide el equipo (ver regla SI en `01-hackathon-rules.md`).
