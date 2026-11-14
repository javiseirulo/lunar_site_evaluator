# lunar_site_evaluator

NASA Space Apps Challenge 2026 — reto **Lunar Landing Site Navigator**.
Herramienta para comparar sitios de aterrizaje lunares y fechas (Sol/Tierra sobre el horizonte → energía y comunicaciones).

> ⏰ Entrega: abre sáb 14 nov 9:00 · **cierra dom 15 nov 23:59 (hora local del Local Event)**.

## 🤖 Cómo trabajamos (humanos **e** IAs — leer primero)

Este repo es la memoria compartida del equipo. Cada persona usa su propia IA (Claude Code) y todas leen/escriben aquí.

**Si eres una IA:** lee [`CLAUDE.md`](CLAUDE.md) y síguelo. Resumen:

1. **gstack por defecto.** Ejecuta `bash scripts/check-gstack.sh`. Si dice `MISSING`, dile al usuario que instale
   gstack antes de trabajar ([cómo](docs/06-gstack-workflow.md)).
2. **Al empezar cada tarea:** `bash scripts/sync-docs.sh` (git fetch + hooks) y lee todo `docs/` de `origin/dev`,
   incluidas las notas de los compañeros en `docs/team/*` y los PRs abiertos.
3. **Todo lo que se piense, decida o investigue se escribe en `docs/` como Markdown, en el momento.**
   Tus notas: `docs/team/<tu-handle>/`. Compartidos (`decisions/log.md`, `04-resources-data.md`): solo añadir al final.
4. **Se trabaja contra `dev`; nunca en `main`.** Issue → rama `<handle>/<n>-<slug>` desde `dev` → Pull Request a `dev`
   (`gh pr create --base dev`, `Closes #n`) → verificación → merge a `dev`. `main` solo recibe `dev` en cada integración.
   El push directo a `main` está bloqueado por hook. PRs pequeños y frecuentes (también de docs).
5. **Reglas del concurso:** la *idea* la ponen los humanos (la IA no puede idear la solución); registra todo uso de IA en
   [`docs/si-usage-log.md`](docs/si-usage-log.md); lista todo recurso externo; sin branding NASA en contenido generado.

**Si eres humano:** instala gstack, abre Claude Code en este repo y trabaja normal; la IA se encarga del ciclo anterior.

## 📚 Índice de conocimiento

Empieza por [`docs/README.md`](docs/README.md):
reglas ([01](docs/01-hackathon-rules.md)) · cómo ganar ([02](docs/02-judging-playbook.md)) ·
el reto ([03](docs/03-challenge-brief.md)) · datos y recursos ([04](docs/04-resources-data.md)) ·
prior art ([05](docs/05-prior-art.md)) · flujo gstack ([06](docs/06-gstack-workflow.md)) ·
ideas ([`docs/ideas/`](docs/ideas/)) · decisiones ([`docs/decisions/log.md`](docs/decisions/log.md)).

## Estructura
```
CLAUDE.md / AGENTS.md   instrucciones para IAs
docs/                   base de conocimiento (Markdown)
scripts/                check-gstack.sh, sync-docs.sh
```

## 🛠️ App web (`web/`) — arrancar en local
```bash
pnpm install   # pnpm descarga Node 22 solo para este repo (.npmrc)
pnpm dev       # http://localhost:5173
pnpm test      # tests + validación de web/public/data contra contracts/
```
Contratos de datos: [`contracts/`](contracts/README.md) · quién toca qué carpeta y cómo usar el store: [`web/README.md`](web/README.md).
Mientras no haya datos reales, `pnpm mocks` regenera datos inventados (la UI muestra "Mock data").
