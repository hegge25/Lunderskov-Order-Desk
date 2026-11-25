# Lunderskov Order Desk

A prototype of the TO-BE process in our report for Lunderskov Chimneys (DTU 41637, Assignment 2). One configurator, built on the PVM, is used in two places:

- a **web configurator** for customers (quotation scenario 2), which gives a budget price and a standard drawing at once;
- the **Order Desk**, where sales and design take an order from enquiry to installed chimney, through the CTO process (C1–C6) or the ETO process (E1–E8).

**All the information available in the case and the report is used**: the PVM's fields, options and cardinalities, the AS-IS and TO-BE process steps, the case's lead times and the requirements. **Where they are silent, the gaps are filled with assumptions**, only to show how the configurator works: prices, the locations and their regulations, the numbers inside the design rules, the TO-BE durations and the orders on the board. The site says this in a note under the top bar.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## What it does, and where it is in the report

| Feature | Report |
|---|---|
| Order board KPIs: quotation lead time, design lead time, blocked orders, orders configured online | Requirements R1, R2, R3, R7 (§3.2) |
| PVM customer view as the form; a value outside an interval makes the order ETO | PVM, Appendix 1; CTO/ETO split (§4.2) |
| Chips under each field: the AS-IS steps (Appendix 3) and TO-BE steps that use it. Hovering lights them up on the strip | PVM–process link, ASIS and TOBE columns (§2.2, §4.2, §4.3) |
| "Send binding quotation" is blocked while the ladder, platform or any other field is missing | R3: complete specification at the quotation |
| Progress strip: the order's stages in the TO-BE process, and below them the same order through TO-BE and AS-IS as two bars on one scale, every step to scale and coloured by stage, with the days saved, R1/R2 per process and the planned delivery dates. TO-BE steps from the swimlanes (quotation scenario 2, CTO C1–C6, ETO E1–E8 with E4 parallel to E2); AS-IS steps from the case with the Appendix 3 numbers, including the three capacity re-calculations. Hovering a field lights up the steps that use it in both bars | TO-BE attachments (§4.1, §4.2); AS-IS processing times (§2.1); R1, R2 (§3.2) |
| R1 and R2 badges on the quotation and design stages | §3.2 |
| Right column grouped by TO-BE step: emission → material → H, d, N and heat loss as one joint task → strength → details | Process DSM (Figure 2), re-sequencing (§4.2) |
| C5: part list and drawing with main dimensions, generated from the configuration. Part names follow the PVM part view | CTO chart C5; framework, Appendix C |
| CTO price shown as final, ETO as an estimate | R6 |
| Web configurator: budget price, standard drawing, "Request binding quotation" creates the enquiry in the Order Desk | Quotation scenario 2, R7 |
| 3D chimney: cutaway, X-ray, dimensions, smoke, wind profile, callouts that jump to their field, ghost parts for missing information | — |

A **guided tour** runs on the first visit and can be replayed with **Tour** in the top bar. In 18 steps and six chapters it follows one order from the customer's web configurator to the salesperson's order page and the design, citing the case and the report. Two steps act on the page themselves: one hovers *Flow rate* to show the PVM–process link, the other moves the order to an unknown site so it becomes ETO, then sets it back. The **?** on the progress strip explains each of its numbers.

Shortcuts on the order page: `C` cutaway, `X` x-ray, `D` dimensions, `S` smoke, `W` wind, `K` context, `1–4` camera presets.

## Where to change things

| What | File |
|---|---|
| PVM fields and intervals | `src/config/pvm.js` |
| PVM–process link (ASIS / TOBE columns) | `src/config/links.js` |
| Process steps, durations, R1/R2 targets | `src/config/process.js` |
| Illustrative regulations, locations, filters, materials | `src/config/rules.js` |
| Design rules, TO-BE step mapping, part list, quote | `src/engine/design.js` |
| Drawing and part list views | `src/views/docs.js` |
| Web configurator | `src/views/web.js` |
| Demo orders | `src/data/seed.js` |
| 3D model | `src/three/model.js` (geometry), `src/three/viewer.js` (scene, camera, interaction), `src/three/effects.js` (smoke, wind, gas flow) |

TO-BE durations are our assumptions, sized to the targets. Order changes are saved in the browser's localStorage. Use "Reset demo data" on the orders page to start over.
