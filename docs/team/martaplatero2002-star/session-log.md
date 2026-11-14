# Notas de sesión — martaplatero2002-star (Marta: visor 3D + Explore)

## 2026-11-14 — Sesión 1: plan del visor 3D
- gstack clonado en `~/.claude/skills/gstack` (`check-gstack.sh` → OK). Falta ejecutar `./setup`, que necesita Bun (no instalado en esta máquina).
- Reescrita mi sección de `docs/10-plan-tecnico.md`, contrastada con el código de `dev`. Cambios principales respecto a mi borrador:
  - El parche polar cubre la misma ventana que `layers.json` (hasta −80°, ±304 km), no 85°S: si no, se quedan fuera 6 de los 20 sitios.
  - Sin `px`/`py` en `sites.json` (ya están `projectSouthPolar` / `latLonToUv`) ni archivo de "vector Sol": la dirección del Sol en el sistema lunar es la misma en todo el parche y sale de cualquier timeseries.
  - Las sombras son ilustrativas y sin la exageración ×2; nada de hillshade precalculado.
  - Las capas de pendiente y PSR ya vienen en `layers.json` (las produce el pipeline); la UI de capas es `LayersPanel` (Javi2) y yo solo las pinto.
  - Estado compartido = store de `@/core`; pesos y rango de fechas son locales de `src/globe`.
  - Contratos nuevos (PR a `contracts/`): heightmap del parche (Pablo), normalización del score (Javi), `historic_sites.json` (yo), `grid_metrics.bin` (opcional).
  - Pendiente de verificar: autoría y versión de `LDEM_80S_80MPP_ADJ` y de las texturas LROC/LOLA → `04-resources-data.md`.
