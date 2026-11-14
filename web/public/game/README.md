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
Creation tool, generation process and license were not specified in the archive;
confirm final credits and, if AI-generated, visible AI disclosure before use in
the challenge submission. No creation tool or license is inferred here.

Some original sprites contain a dark header/caption strip and image sizes vary.
This import preserves those source details; any cleanup or optimisation is a
separate change to review with the Mission owner.
