# Mission artwork — Pablo's asset pack

48 image files with `.png` filenames supplied by Pablo on 2026-11-14 in
`mission_assets_48_completos.zip` (issue #74, related to #49).
Images retain their original names, dimensions, transparency and bytes.

Use public URLs such as `/game/sites/site-rim-1.png` or
`/game/characters/dr-regolith-talk.png`. Importing this pack does not connect it
to the Mission UI or replace any game logic.

| Directory / files | Count |
| --- | ---: |
| `sites/` | 16 |
| `characters/` | 8 |
| `lander/` | 4 |
| `emergencies/` | 5 |
| `verdicts/` | 7 |
| `ui/` | 3 |
| Card back, menu, two mode images and orbit background | 5 |

`assets-manifest.json` records the source ZIP hash, per-image SHA-256, byte size,
dimensions, colour mode and actual format. 38 images are PNG; 10 are WebP bytes
with `.png` filenames in the supplied ZIP. This import retains the original
names and encodings; do not assume encoding from extension when processing them.
The original ZIP stays outside the repository to
avoid storing a second copy of the same images.

These are artistic game illustrations, not DEM products, views of verified
landing sites, scientific lighting calculations or mission photographs.
Credits: Pablo created the images using **Codex**, following the prompt document
supplied by **Cristóbal**. Pablo confirmed this origin on 2026-11-14. The original
prompt document, `generacionimagenes.md`, is retained locally as private source
material; its SHA-256 is in the asset manifest, and its content is not published.
No license terms are inferred from the ZIP.
Add visible AI disclosure when using these generated illustrations in the final
challenge submission. The historical prompt's negative block is source material,
not an instruction to omit that disclosure.

Some original sprites contain a dark header/caption strip and image sizes vary.
This import preserves those source details; any cleanup or optimisation is a
separate change to review with the Mission owner.

## Additions 2026-11-15 (issue #127 / #114)

AI-generated with Higgsfield by the team (Pablo, Marta) from the prompts in
`docs/team/martaplatero2002-star/higgsfield-mission-prompts.md` and
`docs/team/manuelcgg165/historic-portraits-prompt.md`. Same disclosure rule as above.

| File | Use | Processing |
| --- | --- | --- |
| `cockpit/cockpit-frame.png` | Cabin interior around the timelapse window (`CockpitView`) | Cropped to 1160×680 around the window; the flat `#00FF00` glass keyed to transparent (window only, indicator lamps kept) |
| `cockpit/panel-bg.webp` | Texture behind the cockpit gauges | Scaled to 1400 px, WebP |
| `characters/historic/*.png` (13) | Historical-mode narrators: Apollo 11, 12, 14, 15, 16, 17; Blue Ghost M1, Chandrayaan-2 Vikram, Chandrayaan-3, HAKUTO-R M1 and M2, IM-2 Athena, Luna 25 | Unchanged (512×512 RGBA) |

Missions without a portrait yet keep falling back to Dr. Regolith.
