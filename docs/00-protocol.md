# 00 — Protocolo de trabajo del equipo

## Principio
El repo es la memoria compartida. Cada persona trabaja con su propia IA; la IA de cada uno lee lo que
escribieron los demás gracias a `git pull`. Si no está en `docs/`, para el equipo no existe.

## Ciclo de cada sesión
1. `bash scripts/check-gstack.sh` → si falta gstack, instalarlo.
2. `bash scripts/sync-docs.sh` → trae cambios y lista qué cambió.
3. Leer `docs/` (índice en `docs/README.md`), sobre todo `docs/team/*` y `decisions/log.md`.
4. Trabajar; escribir ideas/decisiones/fuentes en Markdown **según ocurren**.
5. Commit pequeño y frecuente: `git add docs && git commit -m "docs(<handle>): ..." && git pull --rebase && git push`.

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
