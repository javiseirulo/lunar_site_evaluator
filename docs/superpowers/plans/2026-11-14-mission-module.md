# Mission Module (South Pole) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable South Pole Mission in `/game`: menu → pixel-scientist intro → random emergency with countdown → 4 face-down cards revealed one by one → pick → travel → timelapse that stops at the failure hour → verdict with reason, lesson and 1–3 stars on a win.

**Architecture:** A pure TypeScript engine (`web/src/game/engine/`) turns (site, timeseries window, requirements) into a verdict with the hour of first failure; a small zustand store (`web/src/game/state/`) drives a phase machine; one React screen per phase (`web/src/game/ui/`). The engine reads requirements from a local adapter shaped like Javi's `MissionConfig` (J9) so it can be swapped for `@/scoring` with one import change. The rest of the app is touched only through the shared store (`selectSite`, `setTime`).

**Tech Stack:** React 19, TypeScript 5.9, zustand 5, Tailwind 4, `motion` 14, `lucide-react`, vitest 3 (node env, `src/**/*.test.ts`). No new dependencies.

**Spec:** `docs/team/manuelcgg165/mission-design.md` — §9 ("Alineación con el plan de Javi" and "✅ Cerrado por Manuel") overrides §4 and §6.

## Global Constraints

- All code under `web/src/game/`; the only file outside it that changes is `web/src/pages/GamePage.tsx` (route wrapper). Do not edit `core/`, `layers/`, `globe/`, `contracts/`.
- No new npm dependencies.
- All user-facing text in **English**. Historical-mode dialogue (later plan) is declared fictional satire.
- Default requirements (adapter for `MissionConfig`, J9 + Manuel): `slope_max_deg: 10`, `max_dark_h: {threshold: 100, objective: 24}`, `max_blackout_h: {threshold: 72, objective: 12}`, `comm_pct: {threshold: 0.5, objective: 0.95}`, `illum_pct: {threshold: 0.5, objective: 0.85}`, `antenna_margin_deg: 2`, `surface_days: 7`.
- Earth link at hour *i* = `(earth_visible?.[i] ?? 1) === 1 && earth_el[i] >= antenna_margin_deg` (adapter approximation until Pablo's horizon profiles; comment it).
- Countdown 180 s; timelapse ≈ 25 s wall-clock for the whole mission; 4 cards per hand.
- Card positions and site order shuffled every game; real site name hidden on the card ("Landing site N"), revealed in the verdict.
- Difficulty `normal | expert` is Mission's own setting, independent of the web's Pro mode.
- Stars on a win: 1–3 from the J7 utility score (`<1/3` → 1, `<2/3` → 2, else 3).
- Do not push. Commit locally per task, messages ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run from `web/`: `pnpm test`, `pnpm typecheck`, `pnpm lint` (pnpm at `/c/Users/TRMCGA/AppData/Roaming/npm`, Node at `/c/Program Files/nodejs`).

## Review Focus

1. Timeseries not loaded yet when the player picks a card → travel waits for it; never evaluates an empty window (test: `simulate` throws on a window shorter than `surface_days`; UI awaits `loadTimeseries`).
2. Landing window runs past the end of the series → `deal` only picks starts with `start + surface_days*24 <= length` (test in Task 2).
3. Countdown hits zero while cards are still flipping → `timeout` phase, timers cleared, Retry starts clean (test on the store reducer in Task 3).
4. Retry/new game must reshuffle (different seed) and reset the shared clock; Retry keeps the same hand (test in Task 3).
5. A hand with no winner is unplayable → `deal` guarantees ≥1 win and ≥1 loss or returns `null` and the UI shows "no valid mission in this data window" (test in Task 2).

---

### Task 1: Engine — requirements adapter, window simulation, stars

**Files:**
- Create: `web/src/game/engine/requirements.ts`, `web/src/game/engine/simulate.ts`, `web/src/game/engine/simulate.test.ts`

**Interfaces:**
- Produces:
  - `type Criterion = { threshold: number; objective: number }`
  - `interface MissionRequirements { slope_max_deg: number; max_dark_h: Criterion; max_blackout_h: Criterion; comm_pct: Criterion; illum_pct: Criterion; antenna_margin_deg: number; surface_days: number }`
  - `const DEFAULT_REQUIREMENTS: MissionRequirements` (values from Global Constraints)
  - `type FailCause = 'slope' | 'cold' | 'blackout' | 'low_sun' | 'low_comm'`
  - `interface WindowMetrics { illum_pct: number; comm_pct: number; max_dark_h: number; max_blackout_h: number; slope_deg: number }`
  - `interface Verdict { win: boolean; cause: FailCause | null; failHour: number | null; metrics: WindowMetrics; score: number; stars: 0 | 1 | 2 | 3; detail: string }`
  - `simulate(site: Site, ts: Timeseries, startIndex: number, req?: MissionRequirements): Verdict`
  - `utility(value: number, c: Criterion): number` (0 at threshold, 1 at objective, clamped, works for both directions)

- [ ] **Step 1: Write failing tests** in `simulate.test.ts` with hand-built `Timeseries` (helper `makeTs(lit: (0|1)[], earthVisible: (0|1)[], earthEl?: number[])`, `step_s: 3600`) and a `makeSite(slope)` helper:
  - `slope 12° → { win: false, cause: 'slope', failHour: 0 }`
  - 168 h with a dark run of 101 h starting at hour 10 → `cause: 'cold', failHour: 110` (hour the run *exceeds* 100)
  - all lit, Earth below 2° for 73 h from hour 0 → `cause: 'blackout', failHour: 72`
  - when cold and blackout both happen, the earlier `failHour` wins
  - all lit + 40 % link with no run > 72 h → `cause: 'low_comm', failHour: 167` (aggregate causes fail at the last hour)
  - all lit, full link, slope 2° → `win: true, stars: 3, cause: null, failHour: null`
  - `utility(24, {threshold:100, objective:24}) === 1`, `utility(100, …) === 0`, `utility(150, …) === 0`
  - throws `RangeError` when `startIndex + surface_days*24 > ts.t_utc.length`
  - against mock data: `simulate` of `mons_mouton` from day 9 (index 216) is a win; `shackleton_rim_01` loses by `slope`
- [ ] **Step 2: Run** `pnpm test src/game` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `requirements.ts` and `simulate.ts`. Check order per hour, first failure wins: slope (hour 0) → cold run → blackout run; then aggregates `illum_pct` / `comm_pct` at the last hour. `score` = mean of utilities of `illum_pct, comm_pct, max_dark_h, max_blackout_h` and slope (`{threshold: 10, objective: 0}`). `detail` = one English sentence with value vs limit ("Longest night 142 h > 100 h"). Mock-data tests read `web/public/data` with `node:fs` like `core/contracts.test.ts` does.
- [ ] **Step 4: Run** `pnpm test src/game` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(game): mission engine with failure hour and stars (#49)`.

### Task 2: Engine — seeded deal and quality bars

**Files:**
- Create: `web/src/game/engine/random.ts`, `web/src/game/engine/deal.ts`, `web/src/game/engine/bars.ts`, `web/src/game/engine/deal.test.ts`

**Interfaces:**
- Consumes: `simulate`, `MissionRequirements`, `Verdict` (Task 1).
- Produces:
  - `mulberry32(seed: number): () => number`; `shuffle<T>(items: T[], rnd: () => number): T[]`
  - `interface Card { slot: number; siteId: string; verdict: Verdict }` (slot = 1…4 after shuffle)
  - `interface Hand { startIndex: number; landingUtc: string; cards: Card[] }`
  - `deal(sites: Site[], series: Record<string, Timeseries>, seed: number, req?: MissionRequirements, size?: number /*4*/): Hand | null`
  - `type Difficulty = 'normal' | 'expert'`; `interface Bar { key: string; label: string; value: number /*0–100*/; text: string }`
  - `qualityBars(site: Site, difficulty: Difficulty): Bar[]` and `barColor(value: number): string` (interpolate `#5a0f0f` at 0 → `#a8f0a0` at 100)

- [ ] **Step 1: Write failing tests** with the 20 mock sites/series:
  - same seed → identical hand; different seeds → different slot order in ≥ 9 of 10 seeds
  - every hand has exactly 4 cards, ≥1 `verdict.win` and ≥1 loss, unique `siteId`s, slots `[1,2,3,4]`
  - `startIndex + surface_days*24 <= length` for 50 seeds
  - with series that make every site lose → returns `null`
  - `qualityBars(site,'normal')` keys `['illum_pct','earth_vis_pct','slope_deg']`; `'expert'` adds `['max_dark_hours','psr_dist_km']`; slope 0° → 100, 20° → 0; `barColor(0) === '#5a0f0f'`, `barColor(100) === '#a8f0a0'`
- [ ] **Step 2: Run** `pnpm test src/game` — Expected: FAIL.
- [ ] **Step 3: Implement.** `deal`: candidate starts every 24 h; shuffle them with the seed; for the first start with ≥1 winner and ≥3 losers, take 1–2 winners (seeded) and fill with losers, preferring distinct `cause`s; shuffle into slots. Bars: labels `Sunlight`, `Earth view`, `Slope`, `Longest dark`, `Icy craters` (closer = better, 0 km → 100, ≥ 20 km → 0; dark 0 h → 100, ≥ 500 h → 0, same scale as #63's `metrics.ts`).
- [ ] **Step 4: Run** `pnpm test src/game` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(game): seeded card deal and quality bars (#49)`.

### Task 3: Game store (phase machine) and content JSON

**Files:**
- Create: `web/src/game/state/gameStore.ts`, `web/src/game/state/gameStore.test.ts`, `web/src/game/data/emergencies.json`, `web/src/game/data/intro.json`, `web/src/game/data/lessons.json`

**Interfaces:**
- Consumes: `deal`, `Hand`, `Difficulty`, `FailCause`.
- Produces:
  - `type Phase = 'menu' | 'intro' | 'alert' | 'dealing' | 'choosing' | 'travel' | 'timelapse' | 'verdict' | 'timeout'`
  - `useGame` (zustand) with state `{ phase, difficulty, seed, emergencyId, hand, chosenSlot, deadline /*epoch ms*/ }` and actions `setDifficulty(d)`, `start()` (menu→intro), `skipIntro()` / `endIntro()` (→alert, sets `emergencyId` and `deadline = now + 180_000`), `beginDealing(hand: Hand)` (→dealing), `revealed()` (→choosing), `choose(slot)` (→travel), `landed()` (→timelapse), `finish()` (→verdict), `timeUp()` (from alert/dealing/choosing → timeout), `retry()` (same hand, → choosing with new deadline), `newGame()` (new seed, → intro skipped → alert)
  - `emergencies.json`: 5 entries `{ id, title, alarm, briefing, catastrophe }` (propulsion failure, solar storm, guidance computer reboot, fuel leak, comms glitch)
  - `intro.json`: `{ speaker: "Dr. Regolith", lines: string[] }` — why the south pole (water ice in permanently shadowed craters, sunlight on the rims, Earth low on the horizon)
  - `lessons.json`: one short lesson per `FailCause` plus `win`
- [ ] **Step 1: Write failing tests** for the reducer: illegal transitions are ignored (`choose` in `menu` keeps `menu`); `timeUp()` during `dealing` → `timeout`, `timeUp()` during `timelapse` is ignored; `retry()` keeps `hand` and resets `chosenSlot`; `newGame()` changes `seed`.
- [ ] **Step 2: Run** `pnpm test src/game` — Expected: FAIL.
- [ ] **Step 3: Implement** the store and write the three JSON files.
- [ ] **Step 4: Run** `pnpm test src/game && pnpm typecheck` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(game): phase store and mission content (#49)`.

### Task 4: Playable loop UI — menu, alert + countdown, cards, verdict

**Files:**
- Create: `web/src/game/ui/MissionGame.tsx` (phase switch), `MenuScreen.tsx`, `AlertScreen.tsx`, `Countdown.tsx`, `CardTable.tsx`, `SiteCard.tsx`, `QualityBar.tsx`, `VerdictScreen.tsx`, `TimeoutScreen.tsx`
- Modify: `web/src/game/GamePanel.tsx` (render `<MissionGame />`), `web/src/pages/GamePage.tsx` (taller container: `min-h-[560px]`)

**Interfaces:**
- Consumes: `useGame`, `deal`, `qualityBars`, `barColor`, `useData`, `loadTimeseries`, `useAppStore` (`selectSite`, `setTime`).
- Produces: `MissionGame` component (no props).

- [ ] **Step 1: Implement.** Menu: two big buttons "South Pole mission" (enabled) and "Historical missions" (disabled, "coming soon"), difficulty toggle Normal/Expert. Alert: red flashing frame (CSS keyframes in the component, respects reduced motion), emergency `title`/`alarm`/`briefing`, `Countdown` (mm:ss from `deadline`, calls `timeUp()` at 0). On entering alert, load all timeseries with `loadTimeseries`, call `deal(…, seed)` and `beginDealing(hand)`; if `null`, show the "no valid mission" message. CardTable: cards slide in one by one face-down (logo + "Landing site N"), then flip one by one (`motion`), each with an image placeholder box ("Illustration pending") and its `QualityBar`s; click a card → `choose(slot)` → other cards fade out, chosen card moves up. Verdict: win → "Congratulations! The site you chose is fit for the mission!" + stars; loss → cause headline, `detail`, lesson from `lessons.json`, real site name, "Try again" (`retry`) and "New mission" (`newGame`). Timeout: "OUT OF TIME" + emergency `catastrophe` + buttons.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint && pnpm test` — Expected: all PASS.
- [ ] **Step 3: Verify in browser** (`pnpm dev`, `/game`): menu → alert with ticking countdown → 4 cards appear and flip → pick → (Task 5 not done: jump straight to verdict) → Try again keeps the same cards → New mission changes them; letting the countdown hit 0 shows OUT OF TIME. No console errors.
- [ ] **Step 4: Commit** `feat(game): playable mission loop (#49)`.

### Task 5: Travel and timelapse

**Files:**
- Create: `web/src/game/ui/TravelScreen.tsx`, `web/src/game/ui/TimelapseScreen.tsx`
- Modify: `web/src/game/ui/MissionGame.tsx`

**Interfaces:**
- Consumes: `Hand.landingUtc`, `Card.verdict.failHour`, `useAppStore.setTime/selectSite`, `PolarMap` from `@/layers` (swap for Marta's `GlobeView` when it ships: one import).
- Produces: nothing new.

- [ ] **Step 1: Implement.** Travel (~4 s): `selectSite(siteId)`, lander icon animates from an orbit ring down to the site label, then `landed()`. Timelapse: map on the left, HUD on the right (Day X of 7, Sun/Earth status from `sampleAt`, running battery-night and blackout counters). `requestAnimationFrame` advances `setTime` from `landingUtc` at `surface_days*24 h / 25 s`; stops at `failHour` (loss: red freeze + cause stamp) or at the end (win: gold burst), then `finish()`. Clean up rAF on unmount and on `timeUp`/retry.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint && pnpm test` — PASS.
- [ ] **Step 3: Verify in browser:** a losing pick stops at the failure day shown in the verdict; a winning pick runs to Day 7; the shared TimeBar moves with the timelapse.
- [ ] **Step 4: Commit** `feat(game): travel and timelapse (#49)`.

### Task 6: Intro with pixel scientist and typewriter

**Files:**
- Create: `web/src/game/ui/IntroScreen.tsx`, `web/src/game/ui/DialogueBox.tsx`, `web/src/game/ui/PixelScientist.tsx`
- Modify: `web/src/game/ui/MissionGame.tsx`

**Interfaces:**
- Consumes: `intro.json`, `useGame.endIntro/skipIntro`.
- Produces: `DialogueBox({ lines: string[]; speaker: string; onDone: () => void })` — reused by the historical mode later.

- [ ] **Step 1: Implement.** `PixelScientist`: inline SVG on a 16×16 grid (lab coat, glasses), idle bob. `DialogueBox`: types each line at ~35 chars/s with a blinking block cursor; click/Enter/Space completes the line, then advances; "Skip" button calls `skipIntro()`; after the last line `onDone()`.
- [ ] **Step 2: Verify** `pnpm typecheck && pnpm lint && pnpm test` — PASS; in browser the intro types, advances with click and keyboard, Skip works, and goes to the alert.
- [ ] **Step 3: Commit** `feat(game): pixel scientist intro (#49)`.

---

**Out of this plan (later):** historical mode (needs Marta's sites + series), real `@/scoring` / `computeArrival` swap (Javi, 15-nov midday), card images, final aesthetic, `metrics.ts` reuse after #63 merges.
