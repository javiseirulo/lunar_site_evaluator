# Design System — Lunar Site Evaluator

> Created 2026-11-15 with `/design-consultation` in non-interactive mode (no research, no mockups,
> no outside voices). The direction is Javi's: take the look Cristóbal built for Mission and apply it
> to the whole site, Apple-minimal. Tokens live in `web/src/index.css`.

## Product Context
- **What this is:** web app to evaluate lunar landing sites by sunlight, Earth visibility and terrain.
- **Who it's for:** from a child (Normal mode) to an aerospace engineer (Expert mode).
- **Project type:** data app + game (Mission).

## Aesthetic Direction
- **Direction:** Retro-futuristic / pixel arcade, kept quiet. Pablo's pixel art carries the personality.
- **Decoration level:** minimal. Hard 2px edge + 4px offset shadow on panels; scanlines only inside Mission.
- **Mood:** a mission-control terminal at night: calm, legible, one thing glowing.
- **Memorable thing:** "I always knew what to press next."

## Normal vs Expert (the core rule)
- **One switch** (header, `proMode` in the store, labelled Normal | Expert). Mission's difficulty is the same switch.
- **Normal:** three pages (Explore, Mission, Learn); Explore shows only the 3D globe, one amber action per screen, plain-language
  numbers ("Day 12 of 365", "in 3 days"), a neutral site list (no scores or colours: results only appear in the right column
  after picking a site, with an 'i' that explains why), "Go to coordinates" for any lat/lon, a live illumination chart.
- **Expert:** + Sites, Street View, Data pages; requirements form, map layers, Mission Timing, Site Check,
  UTC times, site scores in the list, pin by coordinates, site finder, full footer. Nothing is removed from Expert; it is only hidden in Normal.

## Typography
- **Display / labels / buttons:** system monospace (`SF Mono`, Menlo), bold, uppercase + wide tracking for
  small labels and nav; sentence case for page titles.
- **Body:** Avenir Next / system sans.
- **Data:** tabular-nums (`.num`).
- **Scale:** 11 / 12 / 14 / 18 / 24 / 32-40.

## Color
- **Approach:** restrained. Navy neutrals + ONE accent (amber).
- **Page:** `#02050c`. **Panel:** `#061022`. **Raised:** `#0e2040`, `#15305c`. **Edge:** `#24406e`, hi `#4c74b4`.
- **Text:** heading `#fff`, ink `#e6edf7`, muted `#9fb2d0`, faint `#7f93b5`.
- **Accent:** amber `#ffcc4d` (selection, "now", the main action; black text on it), hover `#f08a1d`.
- **Data:** sun `#ffb43c`, Earth `#5ab4ff`, good `#8fe39a`, bad `#ff7a6b`.
- Tokens `violet` and `pink` are kept as aliases of amber so older modules work.

## Spacing / Layout
- 4px base. Max content width 1180px. Square corners (radius 0). Panels: `.box`.
- Explore Normal: list | map + clock | site card. Expert adds a left and right column of panels.

## Motion
- Minimal-functional: 120-220ms color/border transitions; `.btn-go` presses down 3px. Respect reduced motion.

## Components (classes in index.css)
`.box .box-head .tab .nav-btn .btn .btn-go .field .seg .chip .eyebrow .switch .range .space .meter .hint`

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-15 | Global theme = Mission's navy/amber/mono | Javi's request: whole web matches the game |
| 2026-11-15 | Pro mode renamed Expert, shown as a segmented switch | Same switch as Mission difficulty |
| 2026-11-15 | Normal hides requirements form, layers, timing, site check | Few options; Expert keeps them |
| 2026-11-15 | Compare moves to Expert; Explore drops the 2D map (3D globe only); selecting a site flies the globe camera; Mission Clock defaults to 2 days/s with a visible running state | Javi (#93–#96) |
| 2026-11-15 | Landing date selector in Explore (Normal + Expert, #154). Default window keeps the published 2027 clock range; any other date computes the clock/chart client-side over [landing, landing+stay) from `@/ephem`. Dates in years without an ephemeris file are refused with a message. Catalogue `score`/`valid` exist only for the default window, so for other dates map markers go neutral and the Normal list is not score-sorted | Sun/Earth data covers 2026–2055 plus past-mission years only; stale scores must never read as the new date |
