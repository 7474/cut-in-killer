# Cut-in Killer - Copilot Instructions

## Core Concept

1. **Mobile-first casual game** for smartphones in portrait orientation (logical 360x640).
2. **Satisfying catharsis**: blow away annoying mobs (割り込みをする行儀の悪いモブ) on a crowded Tokyo station platform, while well-behaved mobs exit safely via escalators.
3. **Single-finger operation**: tap and swipe only. No multi-touch, no keyboard-only features.

## Design Philosophy

- Flat, abstract top-down visuals (simple shapes, flat colors). No textures or image assets.
- Realistic station behavior as the base (trains arrive, people alight, queue in 2 lanes at escalators, boarders line up beside doors), with exaggerated, comedic consequences for bad mobs (flying onto the tracks, getting carried away by a passing train).
- Bad mob types must be readable at a glance by color and silhouette (cutter: red, phone walker: purple + phone glow, door blocker: brown + backpack).

## Tech Stack

- Plain JavaScript classes loaded with classic `<script>` tags (no modules, no build step, no external libraries). `index.html` must work when opened directly.
- Canvas 2D rendering, Web Audio synthesized sound effects.
- localStorage via `Store` (always wrapped in try/catch).

## Architecture

| File | Responsibility |
| --- | --- |
| `js/config.js` | `CK` constants, score/order tables, stage definitions |
| `js/util.js` | `U` math helpers, `Store` localStorage wrapper |
| `js/audio.js` | `Sound` synthesized effects |
| `js/effects.js` | `Effects`: particles, floating text, rings, banners, shake, hit-stop |
| `js/station.js` | `Train` state machine (away → arriving → stopped → alighting → boarding → closing → departing, or warning → passing for expresses) and `Escalator` (2 lane queues) |
| `js/mob.js` | `Mob` state machine and steering |
| `js/game.js` | `Game`: spawning, collisions, player input (`tap`, `swipe`), scoring, win/lose |
| `js/render.js` | `Renderer`: static background cache + dynamic drawing + HUD |
| `js/main.js` | `App`: screens, pointer input, main loop |

Script load order matters: config → util → audio → effects → station → mob → game → render → main.

## Conventions

- All gameplay coordinates are logical pixels (360x640). Convert pointer input with `Renderer.toLogical`.
- Time-based logic always uses `dt` in seconds.
- Gameplay tuning numbers live in `js/config.js`; avoid magic numbers elsewhere when they affect balance.
- UI text is Japanese. Identifiers are English. Comments may be Japanese.
- Use semicolons and 4-space indentation.

## Balance Checking

There are no automated tests. To check balance, run the game logic headlessly (e.g. with Playwright) by creating `new Game(CK.STAGES[i], {})` and calling `update(1 / 60)` in a loop, comparing an idle run (should fail) with a simple auto-player that taps bad mobs (should clear).

When taking screenshots, always use a portrait mobile viewport (e.g. 390x844).
