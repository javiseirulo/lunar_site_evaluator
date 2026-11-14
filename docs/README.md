# docs/ — base de conocimiento del equipo

Todo lo que pensamos, investigamos y decidimos vive aquí, en Markdown, versionado en Git.
Las IAs (y las personas) lo leen al empezar cada tarea. Ver `../CLAUDE.md`.

| Archivo | Contenido |
|---|---|
| [00-protocol.md](00-protocol.md) | Cómo trabajamos: sincronizar, dónde escribir, convenciones |
| [01-hackathon-rules.md](01-hackathon-rules.md) | Reglas, fechas, elegibilidad, formulario de entrega |
| [02-judging-playbook.md](02-judging-playbook.md) | Criterios de jurado, premios y estrategia para ganar |
| [03-challenge-brief.md](03-challenge-brief.md) | El reto *Lunar Landing Site Navigator* en detalle |
| [04-resources-data.md](04-resources-data.md) | Datasets, APIs, librerías, repos, ofertas (append-only) |
| [05-prior-art.md](05-prior-art.md) | Soluciones existentes y huecos que podemos explotar |
| [06-gstack-workflow.md](06-gstack-workflow.md) | Secuencia de skills gstack y cómo instalarlo |
| [07-mvp-plan.md](07-mvp-plan.md) | Plan de MVP: módulos, contratos, esquema de 7 diapositivas (borrador) |
| **[10-plan-tecnico.md](10-plan-tecnico.md)** | **Plan técnico vigente: arquitectura, stack, contratos, reparto por persona y estado real** |
| [si-usage-log.md](si-usage-log.md) | Registro de uso de IA (obligatorio declararlo en la entrega) |
| [decisions/log.md](decisions/log.md) | Registro de decisiones (append-only) |
| [ideas/](ideas/) | Una idea por archivo + plantilla |
| [team/](team/) | Notas por persona: `team/<github-handle>/` |

## Estado actual
- Fase: **construcción en paralelo con mocks** (H3–H16 del cronograma de `10-plan-tecnico.md`).
- Hecho: esqueleto web v0 (store, contratos, datos mock, shell, capas, mapa 2D) mergeado en PR #53.
- Ramas: todo el trabajo va a **`dev`** (PRs `--base dev`); `main` solo recibe `dev` en cada integración.
- Siguiente: Marta (globo 3D), Pablo (Street View + DEM), Cristóbal (misiones), Javi (efemérides reales sustituyendo los mocks), Javi2 (design system + deploy).
- Última actualización: 2026-11-14 (@javocruz).
