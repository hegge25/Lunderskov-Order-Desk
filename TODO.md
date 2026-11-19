# To do

## Guided tour on first visit
A short tour that runs the first time the site is opened, so the teacher learns what the configurator does and can then explore on their own. Store a "tour seen" flag in localStorage, and add a "Take the tour" button in the top bar to replay it.

Possible steps, each highlighting one part of the screen:
1. **Orders board:** every order runs through the configurator, with CTO/ETO type, stage and status.
2. **Open an order:** go straight into the order with missing specification (LC-2026-0412).
3. **Configuration form:** the fields are the PVM customer view, and the green band on each slider is the PVM interval.
4. **Push a value outside the interval:** the order flips to ETO and the reason appears on the right.
5. **Missing information:** the ghost ladder and platform, and "Release to design" is blocked until they are filled in.
6. **3D chimney:** cutaway, dimensions, wind, camera presets; hover a part to see its specs.
7. **Derived panel:** designer steps A–E, the estimate, and the rule log explaining each decision.
8. **Progress strip:** the TO-BE / AS-IS toggle shows the lead-time difference.
9. **Hand over:** "Now poke around"; reset demo data is on the orders page.

## Other
- Replace the placeholder TO-BE process steps in `src/config/process.js` once the report's TO-BE process is settled.
- Optional: publish on GitHub Pages for a live link.
