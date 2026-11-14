# Registro de decisiones (append-only)

Formato: `- AAAA-MM-DD · @autor · Decisión — Por qué`

- 2026-11-14 · @javiseirulo · Reto elegido: Lunar Landing Site Navigator — decisión inicial del equipo.
- 2026-11-14 · @javiseirulo · Todo el conocimiento va en `docs/` en Git; cada sesión de IA hace pull y lee `docs/` primero — para compartir contexto entre compañeros.
- 2026-11-14 · @javiseirulo · gstack es el set de skills por defecto; sesiones sin gstack deben pedir instalarlo — consistencia de proceso.
- 2026-11-14 · claude · La idea del proyecto la define el equipo (humanos); la IA refina/construye — las reglas 2026 prohíben usar SI para idear la solución.
- 2026-11-14 · @javiseirulo (equipo) · Concepto: un solo pipeline Sol/Tierra+terreno con dos modos — **Explore** (requisitos→sitios, estilo Booking) y **Mission/juego** (sitio→resultado simulado con veredicto explicado). Enfoque polo sur, family-friendly con modo avanzado — surge de la tormenta de ideas del equipo; detalle y riesgos en `docs/ideas/javiseirulo-explore-mission.md`.
- 2026-11-14 · @javiseirulo (equipo) · Límite de alcance acordado en la conversación: "Street View" = cinta de horizonte 360° con Sol/Tierra (no render generativo); modo avanzado/pro del juego = V2 — para llegar al demo a tiempo.
- 2026-11-14 · claude · Propuesta pendiente de aprobación del equipo: chatbot Gemini, capa de minerales y Genie 3 fuera del MVP (V2); "datos del clima" no aplica a la Luna (Meteomatics es clima terrestre) — por validez científica y alcance.
- 2026-11-14 · @javiseirulo (equipo) · Público objetivo principal: técnico/profesional. Prioridad 1º Explore, 2º Mission (modo profesional + modo estudiante de jugador único/clase). Sin multijugador tipo Kahoot — no encaja con el target ni da tiempo.
- 2026-11-14 · @javiseirulo (equipo) · Formato de entrega: ≤7 diapositivas con capturas por feature (no vídeo de 30 s); no jugar en vivo con el jurado — 30 s se queda corto y conectar móviles tarda demasiado.
- 2026-11-14 · claude (propuesta, pendiente de OK del equipo) · Subir al núcleo del MVP: comparación lado a lado, lista curada de sitios + coordenadas propias, y métricas del brief (elevación solar, duración de luz, ventanas de Tierra, cuenta atrás Sunset/Earthset) — son lo que el reto pide explícitamente y puntúan en Relevance/Validity. Contraste hecho con `docs/03-challenge-brief.md` y el resumen del reto pegado por javiseirulo.
- 2026-11-14 · claude · Corrección: el límite de ≤7 diapositivas incluye la portada; el esquema de `07-mvp-plan.md` se ajustó a 7 con portada.
- 2026-11-14 · claude (propuesta, pendiente de OK del equipo) · Reparto en 5 roles (P1 datos/ciencia, P2 servicio/sitios/despliegue, P3 frontend Explore, P4 visualización de sitio, P5 Mission y entrega) con contrato de datos + fixtures primero para trabajar en paralelo — ver `docs/08-work-plan.md` e issues #9–#27.
