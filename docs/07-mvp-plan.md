# 07 — Plan de MVP (borrador, 2026-11-14)

> Borrador de implementación a partir de `docs/ideas/javiseirulo-explore-mission.md`. Los valores marcados ⚠️ son
> propuestas por validar (no decisiones). Entrega: **dom 15 nov 23:59 hora local**.

## Prioridades (decididas por el equipo)
1. **Explore** (técnico/profesional, simple por defecto, *Advanced settings* para profundizar).
2. **Mission**: modo profesional + modo estudiante (jugador único/clase). Solo cuando Explore funcione.
3. Extras si sobra tiempo: misiones históricas, "barrios" con nombre. V2: chatbot Gemini, capa de minerales, Genie 3.

## Módulos y contratos
| # | Módulo | Entrada | Salida |
|---|---|---|---|
| a | Precompute (Python: SPICE/Skyfield + LOLA) | DEM del polo sur, rango de fechas | Capas por celda y ventana temporal: % iluminación solar, % visibilidad Tierra, pendiente, altitud; + perfil de horizonte por sitio candidato |
| b | API de scoring/filtrado | filtros (mín. iluminación, mín. visibilidad Tierra, pendiente máx., ventana de fechas) | lista de sitios + top 5 con puntuación y motivo |
| c | UI globo + filtros | respuesta de (b) | mapa/globo 3D con puntos, sliders, barra temporal |
| d | Ficha de sitio | id de sitio | métricas + cinta de horizonte 360° con Sol y Tierra a lo largo del tiempo |
| e | Motor de misión | sitio elegido + escenario | simulación de N días + veredicto con motivo determinista |
| f | Demo/docs | — | diapositivas, referencias, declaración SI |

⚠️ **Decisiones técnicas abiertas del módulo (a)** (bloquean al resto): resolución de malla (ej. 100-250 m en 80-90°S; 5 m solo en sitios Barker),
rango y paso temporal (ej. ventana de 1 año a paso horario/diario), formato (GeoTIFF/COG vs. tiles JSON/PNG), dónde se aloja (Google Cloud / Azure / estático).
Validación: contrastar puntos de prueba con Horizons y con mapas Barker/LPI; anotarlo en el PR.

## Esquema borrador de las 7 diapositivas (a decidir por el equipo)
1. Problema (en una imagen) · 2. Usuario y por qué las herramientas actuales no sirven · 3. Explore: filtros → mapa en vivo · 4. Ficha de sitio + horizonte 360° (Sol/Tierra)
5. Mission (modo profesional y estudiante) con veredicto explicado · 6. Datos NASA y validación (Horizons/LOLA) + referencias · 7. Impacto/siguiente paso + enlace/QR del proyecto.

## Reglas recordatorio
Todo recurso en `docs/04-resources-data.md`; todo uso de SI en `docs/si-usage-log.md` (código incluido); sin branding NASA; sin menores en el demo; entrega en inglés.
