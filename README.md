# Lunderskov Order Desk

A prototype internal tool for Lunderskov Chimneys (DTU 41637, Assignment 2). It shows how an order could be run by product configuration: the customer view of the PVM is the order form, a rules engine plays Designers A–E, and the chimney is drawn in 3D from the result.

**All regulations, prices, timings and orders are dummy data.**

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## What it does

- **Guided tour**: runs on the first visit (9 steps) and can be replayed with **Tour** in the top bar. The **?** on the progress strip explains each of its numbers.

- **Orders board**: KPIs and every order with its type (CTO/ETO), stage, delivery date and status.
- **Order page**:
  - **Progress strip**: stage dates, a to-scale bar of every process step, today marker, and a TO-BE / AS-IS toggle.
  - **Configuration** (left): PVM customer-view fields, checked live. Ladder and platform follow the PVM's [0;1]: the customer can choose none, one, or not have answered yet, and a platform needs a ladder. Values outside an interval make the order ETO. Missing fields block "Release to design". Impossible combinations show as conflicts.
  - **3D chimney** (middle): parametric three.js model. It has a cutaway (insulation, liners glowing by flue gas temperature, rising gas), X-ray, dimension lines, a smoke plume, a wind profile, and context (the plant, a person for scale). There are four camera presets. Feature callouts sit beside the chimney with leader lines. Clicking one scrolls the form to that feature (e.g. a missing ladder). Hovering or clicking a part links it to the side panel, changed parts flash, and ghost parts mark what the customer has not specified yet.
  - **Derived** (right): the result of each designer step (A–E), the quote, and the rule log explaining each decision.

Shortcuts on the order page: `C` cutaway, `X` x-ray, `D` dimensions, `S` smoke, `W` wind, `K` context, `1–4` camera presets.

## Where to change things

| What | File |
|---|---|
| PVM fields and intervals | `src/config/pvm.js` |
| Dummy regulations, sites, filters, materials | `src/config/rules.js` |
| Process steps and durations (TO-BE is a placeholder) | `src/config/process.js` |
| Design rules (Designers A–E), quote | `src/engine/design.js` |
| Demo orders | `src/data/seed.js` |
| 3D model | `src/three/model.js` (geometry), `src/three/viewer.js` (scene, camera, interaction), `src/three/effects.js` (smoke, wind, gas flow) |

Order changes are saved in the browser's localStorage. Use "Reset demo data" on the orders page to start over.
