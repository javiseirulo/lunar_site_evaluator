# 00 — Protocolo de trabajo del equipo

## Principio
El repo es la memoria compartida. Cada persona trabaja con su propia IA; la IA de cada uno lee lo que
escribieron los demás gracias a `git pull`. Si no está en `docs/`, para el equipo no existe.

## Ciclo de cada sesión
1. `bash scripts/check-gstack.sh` → si falta gstack, instalarlo.
2. `bash scripts/sync-docs.sh` → trae cambios y lista qué cambió.
3. Leer `docs/` (índice en `docs/README.md`), sobre todo `docs/team/*` y `decisions/log.md`.
4. Trabajar; escribir ideas/decisiones/fuentes en Markdown **según ocurren**.
5. Commit pequeño y frecuente **en tu rama** (nunca en `main`) y PR contra `dev` (ver "Flujo de issues, ramas y PRs").

## Flujo de issues, ramas y PRs (OBLIGATORIO)
**Ramas:** `dev` = integración (aquí entra todo el trabajo, desde 2026-11-14) · `main` = estable/entrega, solo recibe `dev` con un PR
`dev` → `main` en cada punto de integración.

**`main` es solo lectura: nadie hace push directo.** (GitHub no permite proteger ramas en repos privados gratis,
así que lo imponen el hook `.githooks/pre-push` —activado por `scripts/setup.sh` / `sync-docs.sh`— y este acuerdo.)

1. **Issue primero.** Toda feature, investigación o bug es un issue (plantillas en `.github/ISSUE_TEMPLATE/`):
   `gh issue create` o desde la web. Una persona asignada por issue. Etiquetas: `feature`, `docs`, `bug`, `blocked`, `demo`, `science-validation`.
2. **Rama desde `dev` actualizado:** `git switch -c <handle>/<n>-<slug> origin/dev` (ej. `javiseirulo/12-horizon-profile`).
3. **Trabajar y commitear en la rama**, referenciando el issue (`#12`). Las notas de `docs/` también van en tu rama.
4. **Abrir PR contra `dev`** (`gh pr create --base dev`; plantilla automática) con `Closes #12`. Ojo: GitHub solo cierra el issue
   automáticamente cuando el cambio llega a `main`; ciérralo a mano si hace falta antes. Describir cómo se verificó.
5. **Verificación:** otra persona revisa (o al menos `/review` de gstack + prueba manual). Cambios que afecten a cálculos científicos: comparar con Horizons y anotarlo en el PR.
6. **Merge a `dev` solo tras verificar**, con *squash* (el repo borra la rama al mergear). Quien mergea es quien no escribió el PR, salvo cambios de docs triviales.
7. Tras mergear: `bash scripts/sync-docs.sh` para traer lo nuevo.
8. **Integración `dev` → `main`:** en cada hito (ver calendario) alguien abre un PR `dev` → `main` (merge normal, sin squash),
   comprueba que CI pasa y la app funciona, y se mergea con OK del equipo.

Como los demás ven tu trabajo cuando se mergea, **abre PRs pequeños y frecuentes** (también de docs) y usa
`gh pr list` para saber qué hacen los compañeros.

## Dónde escribir (evita conflictos)
- **Tus notas/ideas/sesiones:** `docs/team/<tu-handle>/` (solo tú editas ahí).
- **Una idea formal:** `docs/ideas/<handle>-<slug>.md` usando `docs/ideas/_template.md`.
- **Decisiones del equipo:** añadir al final de `docs/decisions/log.md` (fecha, autor, decisión, por qué).
- **Recursos/datasets/refs:** añadir al final de `docs/04-resources-data.md`.
- **Uso de IA:** añadir a `docs/si-usage-log.md` (qué herramienta, para qué).
- Archivos `00-06` son referencia: editar solo para corregir errores o ampliar; no borrar lo de otros.

## Convenciones
- Fechas ISO (`2026-11-14`). Autor = handle de GitHub.
- Cada afirmación científica/técnica con su fuente (URL + versión del dataset).
- Idioma: notas internas en español; textos de entrega en inglés.
- Commits: sin secretos, sin datasets pesados (usar enlaces; los `.tif` van fuera del repo o en `data/` ignorado).

## Roles sugeridos (rellenar)
| Rol | Persona |
|---|---|
| Producto / idea | |
| Datos y ciencia (efemérides, LOLA) | |
| Frontend / visualización | |
| Storytelling / demo / vídeo | |
