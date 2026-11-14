# CLAUDE.md — instrucciones para cualquier IA (Claude Code, etc.) en este repo

Proyecto: **NASA Space Apps 2026 — Lunar Landing Site Navigator** (equipo `lunar_site_evaluator`).
Este archivo manda sobre el comportamiento por defecto. `AGENTS.md` apunta aquí.

## 0. Antes de nada: comprobar gstack (OBLIGATORIO)

El equipo trabaja por defecto con la suite de skills **gstack** (`/office-hours`, `/plan-ceo-review`,
`/plan-eng-review`, `/plan-design-review`, `/review`, `/qa`, `/ship`, `/investigate`, `/browse`, ...).

1. Ejecuta `bash scripts/check-gstack.sh`.
2. Si sale `MISSING`: **detente y dile al usuario que instale gstack** antes de seguir
   (instrucciones en `docs/06-gstack-workflow.md`). No improvises sin gstack.
3. Usa los skills de gstack siempre que aplique. Para navegar la web usa `/browse`.

## 1. Al empezar CADA tarea/sesión (OBLIGATORIO)

1. `bash scripts/sync-docs.sh` (`git fetch`, activa hooks, muestra cambios de `docs/` en `origin/main` y PRs abiertos; si no hay red, avisa al usuario).
2. Lee **todo** `docs/` (empieza por `docs/README.md`), especialmente:
   - `docs/00-protocol.md` (cómo trabajamos)
   - `docs/01-hackathon-rules.md` y `docs/02-judging-playbook.md` (cómo se gana)
   - `docs/team/*/` (ideas y notas de TODOS los compañeros, no solo del usuario actual)
   - `docs/decisions/log.md` (decisiones ya tomadas; no las reabras sin motivo)
3. Resume al usuario en pocas líneas qué hay nuevo desde su última sesión.

## 2. Mientras trabajas: todo lo pensado va a Markdown

- Cada idea, decisión, hallazgo, fuente o conclusión relevante se escribe en `docs/` **en el momento**,
  no al final. Si lo dijiste en el chat y importa, tiene que estar en un `.md`.
- Tus notas personales/de sesión: `docs/team/<handle>/` (un directorio por persona → evita conflictos de merge).
  El `<handle>` es el usuario de GitHub (ej. `javiseirulo`).
- Archivos compartidos (`docs/decisions/log.md`, `docs/04-resources-data.md`...) son **append-only**: añade al
  final con fecha y autor, no reescribas lo de otros.
- Al terminar un bloque de trabajo: commit en tu rama y push de la rama (nunca a `main`); abre/actualiza el PR.
  Pregunta al usuario antes de hacer push o mergear si no lo ha autorizado.

## 2b. Issues, ramas y PRs — NUNCA trabajar ni pushear en `main`

- Toda tarea parte de un **issue** (`gh issue list` / `gh issue create`). Si el usuario pide algo sin issue, propón crearlo.
- Rama: `<handle>/<n>-<slug>` desde `origin/main` actualizado. Si estás en `main`, crea la rama antes de editar.
- PR con `Closes #n`, plantilla rellenada, verificación descrita. Mergear a `main` solo tras verificar (otra persona o
  `/review`) y con confirmación del usuario. Detalle: `docs/00-protocol.md`.

## 3. Reglas del concurso que NO se pueden romper

- **La IDEA debe ser humana.** Las reglas dicen que la SI (Super Intelligence = IA) "no debe usarse para
  idear cómo resolver el reto". Puedes ayudar a investigar, cuestionar, refinar, estructurar y construir una idea
  que los humanos hayan propuesto; no inventes tú la idea ganadora y se la entregues. Registra el origen de la
  idea en `docs/ideas/`.
- **Registra todo uso de IA** en `docs/si-usage-log.md` (se declara en el formulario de entrega; código/datos
  generados por IA deben reconocerse en descripción y metadatos; imágenes/vídeo con marca de agua visible).
- Prohibido usar marca NASA (logos, banderas, identificadores de misión) en contenido generado.
- Todo recurso externo (código, texto, imágenes, datos, aunque sea open source) → `docs/04-resources-data.md`
  y luego al campo *References* de la entrega.
- Nada de menores de 18 en imagen/vídeo/audio del demo.
- Entrega y demo en inglés. Demo: vídeo ≤30 s o ≤7 diapositivas.
- Hay que usar al menos un dato/recurso NASA para ser elegible a premios globales.

## 4. Estilo

- Responde al usuario en español; el contenido de entrega (submission) va en inglés.
- Sé concreto: recomienda, no hagas listas de opciones infinitas.
- No inventes datos científicos: cita fuente y versión del dataset.
