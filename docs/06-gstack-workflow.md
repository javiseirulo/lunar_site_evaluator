# 06 — gstack: instalación y secuencia de trabajo

## Por defecto usamos la suite de skills **gstack**
Si tu sesión de Claude Code no lo tiene (`bash scripts/check-gstack.sh` → `MISSING`), **instálalo antes de trabajar**.

### Instalación
Repo oficial: https://github.com/garrytan/gstack · Requisitos: Claude Code, Git, [Bun](https://bun.sh/) ≥1.0.

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

Después reinicia Claude Code y confirma que `/office-hours` aparece en la lista de skills.
(Opcional, según el README oficial: añadir una sección "gstack" a tu `~/.claude/CLAUDE.md` indicando usar `/browse`
para navegar la web y listando los skills.) Actualizar: `/gstack-upgrade`.
Modo equipo para repos compartidos (lo ejecuta una sola persona dentro del repo y hace commit):
`(cd ~/.claude/skills/gstack && ./setup --team) && ~/.claude/skills/gstack/bin/gstack-team-init required`.

Skills disponibles: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`,
`/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`,
`/benchmark`, `/browse`, `/qa`, `/qa-only`, `/retro`, `/investigate`, `/document-release`, `/cso`, `/autoplan`...
Navegación web: **siempre `/browse`** (no usar herramientas de Chrome directas).

## Secuencia propuesta para este hackathon (comprimida: ~1 día)
| # | Fase | Skill | Salida (a `docs/`) |
|---|---|---|---|
| 1 | Contexto | (este repo) | `01–05` |
| 2 | **Ideación humana** | cada persona escribe su idea en `docs/ideas/` (sin IA generando la idea) | `ideas/<handle>-*.md` |
| 3 | Someter ideas a debate | `/office-hours` (pregunta incómoda, valida demanda y ángulo) | notas en `team/<handle>/` |
| 4 | Elegir idea | decisión de equipo | `decisions/log.md` |
| 5 | Revisión de alcance/ambición | `/plan-ceo-review` | `decisions/log.md` |
| 6 | Arquitectura y datos | `/plan-eng-review` | `docs/07-architecture.md` (crear) |
| 7 | Diseño/UX | `/design-consultation` → `/plan-design-review` | `docs/08-design.md` (crear) |
| 8 | Construir | código + `/review` continuo | repo |
| 9 | Verificar | `/qa`, `/investigate` | notas |
| 10 | Entrega | `/ship`, `/document-release`; demo ≤30 s / ≤7 slides | `docs/09-submission.md` (crear: borrador del formulario) |

Nota de cumplimiento: gstack/IA aquí **refina, cuestiona y construye** ideas humanas; no genera la idea (ver `CLAUDE.md` §3).
Anota cada uso significativo en `si-usage-log.md`.
