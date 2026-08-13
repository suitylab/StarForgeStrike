# StarForge Strike

A vertical-scrolling bullet-hell shooter built with **TypeScript + Vite + THREE.js**, featuring **2D gameplay rendered in 3D**. Fly a cosmic fighter through the looping corridors of a high-tech interstellar military base — dodge dense bullet patterns, take down elite squadrons and massive bosses, and clear three visually distinct levels.

> Design document: [`docs/design-doc.md`](docs/design-doc.md) · Development plan: [`docs/development-plan.md`](docs/development-plan.md)

## Features

- **Intense bullet-hell combat** — Dense, readable bullet patterns that reward precise movement and pattern memorization.
- **Three distinct fighters** — VANGUARD / PHANTOM / TITAN, each with a unique look and fire style.
- **Power-up system** — Collect POWER to upgrade firepower; each fighter has its own progression path (parallel streams / scatter spread / wide beam).
- **Wingman system** — Five wingman types (PULSER / LANCE / SEEKER / FLARE / BARRAGE), up to 5 carried, following the player in an arc formation.
- **Rich enemy roster** — 3 basic enemies + 4 elite enemies + 3 multi-phase bosses.
- **Modular levels** — Three themed levels built from looping corridor segments that connect head-to-tail indefinitely, dynamically generated and recycled as you advance.
- **Flashy presentation** — Hit/explosion effects, screen shake, hit stop, particles, parallax background, and boss warning banners.
- **High performance** — Both player bullets and enemy bullets use object pooling for smooth play even at full-screen bullet density.

## Tech Stack

- **TypeScript** — fully typed codebase
- **Vite** — build tool and dev server
- **THREE.js** — 3D rendering engine

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Production build
npm run build

# Preview the production build
npm run preview

# Deploy to Cloudflare Pages (via Wrangler)
npm run deploy
```

### Deployment

This project is configured for **Cloudflare Pages** via [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

1. Run `npx wrangler login` to authenticate (one-time).
2. Run `npm run deploy` (or `npm run build` first to build locally).

Configuration lives in [`wrangler.json`](./wrangler.json) (`pages_build_output_dir: "dist"`), with the [`@cloudflare/vite-plugin`](https://developers.cloudflare.com/vite/) wired into [`vite.config.ts`](./vite.config.ts).

## Controls

| Key | Action |
|-----|--------|
| `W` / `S` / `A` / `D` | Move up / down / left / right |
| Auto-fire | Continuous fire, no key required |
| `ESC` or `P` | Pause / resume |
| `Enter` / `Space` | Confirm fighter selection |
| `A`/`D` or `←`/`→` | Cycle fighter selection |

## Game Content

### Fighters

| Fighter | Role | Power Progression |
|---------|------|-------------------|
| **VANGUARD** | Balanced | Parallel bullet streams 1 → 2 → 3 → 4 → 5 |
| **PHANTOM** | Agile | Fan scatter 3 → 5 → 7 → 9 shots |
| **TITAN** | Heavy | Single wide energy beam that thickens with level |

### Wingmen

| Wingman | Attack Behavior |
|---------|-----------------|
| **PULSER** | Rapid small bullets in a straight line parallel to the player |
| **LANCE** | Continuous thin laser beam that pierces enemies |
| **SEEKER** | Homing missiles that track the nearest enemy |
| **FLARE** | Fan spread of 3 bullets at 30° angles |
| **BARRAGE** | Dense burst of 5 bullets in a narrow cone |

> Max 5 wingmen; picking up a new wingman when full replaces the oldest one. Wingmen cannot be destroyed by enemy fire.

### Enemies

**Basic enemies**

| Name | Attack | HP |
|------|--------|-----|
| **DRONE** | 1 slow bullet straight down | 1 |
| **RAIDER** | 3-bullet fan spread downward | 2 |
| **SENTRY** | Aimed 2-bullet burst at the player | 3 |

**Elite enemies**

| Name | Attack | HP |
|------|--------|-----|
| **REAPER** | Spiral pattern of 6 rotating bullets | 8 |
| **WARDEN** | 5-bullet spread plus charged aimed laser | 12 |
| **HARBINGER** | 3 homing missiles | 10 |
| **OVERLORD** | Alternating ring bursts and aimed streams | 15 |

### Levels & Bosses

| Level | Theme | Boss | Boss Phases | Time Par |
|-------|-------|------|-------------|----------|
| **1 · TITAN GATE** | Cold steel corridors with cyan energy conduits | **IRONCLAD** (200 HP) | Wide spread → aimed laser sweeps → rotating spirals | 5 min |
| **2 · VOID REACTOR** | Organic-tech hybrid, purple membranes & energy cores | **VOID REAVER** (300 HP) | Homing missile volleys → radial bursts → alternating spiral & aimed | 7 min |
| **3 · SOVEREIGN CORE** | Pristine white-and-gold command deck | **SOVEREIGN** (500 HP) | Multi-directional bullet walls → targeted laser barrages → combined, faster | 9 min |

### Pickups

- **POWER** — Cyan hexagonal crystal; raises power level by 1 (max 5). At max power it converts to `+500` points with a golden flash and floating text.
- **Wingman module** — Silver drone module; grants a random wingman type.

### Scoring

| Event | Points |
|-------|--------|
| Destroy basic enemy | 100 |
| Destroy elite enemy | 500 |
| Destroy boss | 5000 |
| POWER at max power | +500 |
| Level clear bonus | 1000 per remaining health point |
| Time bonus | 100 per 10 seconds under par |

## Game Flow

```
Main Menu → Plane Select → Level 1 → Settlement → Level 2 → Settlement → Level 3 → Victory
                            ↘ Pause (Resume / Restart / Abandon)
                              ↘ Game Over (Retry / Return to Base)
```

## Architecture Overview

```
src/
├── main.ts                  # Entry point: renderer, scene, camera, main loop
└── components/
    ├── Game.ts              # Game orchestrator (GameState, GameStats)
    ├── GameConfig.ts        # Global config & fighter metadata
    ├── Player.ts            # Player movement, health, invincibility
    ├── Fighters.ts          # Fighter mesh builders (buildPhantom / buildTitan)
    ├── Bullet.ts / BulletPool.ts        # Player bullets & object pool
    ├── EnemyBullet.ts / EnemyBulletPool.ts # Enemy bullets & object pool
    ├── Enemy.ts             # Basic enemies & mesh builders
    ├── EliteEnemy.ts        # Elite enemies (incl. HomingMissile)
    ├── IroncladBoss.ts / VoidReaverBoss.ts / SovereignBoss.ts # Level bosses
    ├── Wingman.ts           # Wingman base class & 5 subclasses
    ├── PowerPickup.ts / WingmanPickup.ts / MedkitPickup.ts # Pickups
    ├── LevelConfig.ts       # Level wave configs & flow management
    ├── ModularSegment.ts    # Modular corridor generation & recycling
    ├── ParallaxBackground.ts / AmbientParticles.ts # Background & ambient particles
    ├── Effects.ts           # Hit / explosion / entrance effects
    ├── Collision.ts         # AABB collision
    ├── HUD.ts               # In-game HUD
    └── UIManager.ts         # Menu, plane select, pause, settlement, failure, victory screens
```

## Scope

- **No audio** — visual feedback only.
- **No online features** — no multiplayer, leaderboards, or cloud saves.
- **No save/load system** — progression resets on close.
- **Keyboard only** — no touch or gamepad support.
- **Hand-crafted level flow** — not procedurally generated.