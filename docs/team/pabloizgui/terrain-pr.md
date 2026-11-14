# PR draft: Deliver polar terrain and align production with Javi J0

> Borrador histórico de la entrega separada. La descripción actual de la rama
> unificada está en [team-push-pr.md](team-push-pr.md).

Base: `dev`. Head: `pabloizgui/37-terrain-handoff`.
Closes #37. Refs #38, #48, #64.

## Qué cambia

Marta needs a precise height grid covering the existing south-polar layer window.
This delivers a real 1025² Float32 LE heightmap, validity mask and georeferencing
from NASA LOLA, plus real elevation/slope layers and native-pixel terrain samples
at the 20 current fixture coordinates. The main mock catalogue remains separate.

Production settings now match Javi J0/J10: 5 m observer, 0.1° curated profiles,
1° heatmap profiles, 300 km initial range and convergence checks to 310 km.
A 240 m DEM extending to 60°S supplies the planned far terrain. Delivery metadata
explicitly reports **zero computed horizon profiles** and ephemerides pending Javi.
The observer height is not added to Marta's surface heights. Sun/Earth vectors
are owned by Javi; frame realization and DE421/DE440 alignment remain required.

`origin/dev` at `bd0880d` is merged without rewriting local progress; J0/J10
come from `461507a`. PR #66 is
read for compatibility but is not merged into this branch. Street View changes
remain in Pablo's separate #46 branch, keeping the terrain delivery independent.

## Cómo se ha verificado

- Python terrain/download/export/handoff tests, including unchanged height bytes,
  complete azimuth grids and rejection of short range or incorrect observer height.
- JavaScript consumer checks every height/mask sample, hashes, grid alignment,
  polar coverage and PNG encoding; verifies the new production metadata.
- Native web tests, TypeScript, lint and build; committed payload byte checks
  protect hashes across Windows/Linux. GIS rasters stay outside the public bundle.
- Exact commands/results are in the handoff guide. Remote CI remains pending.
- `gstack-checks` has a known Windows launcher exit 127; do not treat the wrapper
  as green. Native checks are reported independently.

## Review requested

Marta/Javi2: review `PolarHeightmap`, vertex registration, mask and layer integration.
Javi: review observer/azimuth/range, horizon completeness policy and vector/frame
interface. Product owner: confirm curated catalogue #48 before the first batch.
Do not close #38: horizon computation, convergence and runtime benchmark remain.

## Checklist

- [x] Branch includes current `dev`; intended PR base is `dev`.
- [x] Documentation, NASA references and AI usage updated.
- [x] Raw multi-GB datasets excluded; only small derived web assets included.
- [ ] Team contract review and remote CI before merging.

This is a prepared description, not a published PR or a message to teammates.
