# Prompt: retratos de narradores del modo Historical (#114)

Petición de @Manuelcgg165 (2026-11-15): caras cartoon basadas en los astronautas reales (y personajes para las naves robóticas),
con el mismo estilo que la serie nueva de Dr. Regolith. El juego las busca en
`web/public/game/characters/historic/<archivo>.png`; mientras no existan, sale Dr. Regolith en su lugar.

## Prompt (copiar tal cual en la IA de imágenes)

> Create a set of pixel-art character portraits for a kids' educational game about historic Moon landings.
>
> **Style (match exactly across the whole set):** 16-bit-era pixel art with smooth shading, chunky readable pixels, warm
> friendly cartoon proportions (slightly big head, expressive eyes), soft purple/magenta rim light, bust framing from the chest
> up, character facing slightly to the right, **fully transparent background**, square canvas 512×512, no text, no border,
> no frame. Same look as a friendly white-haired "mad scientist" mascot in a lab coat (our reference character).
>
> **Likeness:** for each real astronaut, first **search the internet for official portrait photos** of that person at the time
> of their mission (age, haircut, face shape), and draw a kind, recognisable caricature of them. Keep it respectful and
> fun: big smile or adventurous expression. They wear a white spacesuit with the helmet off (helmet under the arm or not
> visible).
>
> **Hard rules:** no agency logos, no national flags, no mission patches, no name tags, no insignia or text of any kind on
> the suits or anywhere in the image. No children. Plain white suits.
>
> **Robotic missions:** draw the spacecraft itself as a cute cartoon character with a face (eyes on the camera/sensors,
> a friendly expression), same pixel style, same framing, transparent background. Base the shape on real photos of the
> spacecraft (search the internet).
>
> Deliver one PNG per character with these exact file names:
>
> | File | Character | Notes |
> |---|---|---|
> | `apollo_11.png` | Neil Armstrong (1969) | calm, confident smile |
> | `apollo_12.png` | Pete Conrad (1969) | big gap-toothed grin, cheeky |
> | `apollo_14.png` | Alan Shepard (1971) | holding a golf club over the shoulder |
> | `apollo_15.png` | David Scott (1971) | holding a hammer and a feather |
> | `apollo_16.png` | John Young (1972) | jumping-salute energy, happy |
> | `apollo_17.png` | Gene Cernan (1972) | proud, a bit nostalgic ("the last one") |
> | `chandrayaan_2_vikram.png` | Vikram lander (Chandrayaan-2), box-shaped gold lander | nervous expression |
> | `chandrayaan_3.png` | Vikram lander (Chandrayaan-3) | same design, determined and happy (second try) |
> | `hakuto_r_m1.png` | HAKUTO-R Mission 1 lander (ispace) | curious, a bit worried |
> | `hakuto_r_m2.png` | "Resilience" lander (HAKUTO-R Mission 2) | brave, fists up |
> | `luna_25.png` | Luna 25 lander (Russia, 2023) | serious, focused |
> | `blue_ghost_m1.png` | Blue Ghost lander (Firefly) | cheerful, holding popcorn (it filmed a sunset) |
> | `im2_athena.png` | Athena lander (Intuitive Machines IM-2), tall hexagonal lander | adventurous, with a drill |
>
> Optional, for later missions: `apollo_*` crewmates (Buzz Aldrin, Jack Schmitt), `luna_17.png` Lunokhod 1 rover (bathtub
> body, eight wheels), `change_3.png` Yutu rover (white jade rabbit vibe), `change_4.png` Yutu-2, `slim.png` SLIM lander
> (upside down, laughing), `im1_odysseus.png` Odysseus lander (tipped on its side, thumbs up), `surveyor_1.png` Surveyor
> lander (three legs), `luna_9.png` Luna 9 (ball with petals).

## Después de generarlas

Guardarlas en `web/public/game/characters/historic/` con esos nombres (PNG transparente; el juego las escala a 64–144 px).
Pásamelas como las del doctor y las coloco yo.
