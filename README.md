# Ikigai Labs — website

Landing page for a web3 incubator, built around a 3D robot mascot that travels through an
S-shaped glass pipe as you scroll and follows the cursor along it.

## Run it

```bash
cd site
npm install
npx vite --port 5179     # http://localhost:5179
npx vite build           # production build in site/dist
```

## What's where

| Path | What it is |
|---|---|
| `site/src/components/PipeWorld.jsx` | Fixed WebGL layer: the S pipe (built from `[data-pipe]` / `[data-lane]` markers) and the robot's journey, gestures and faces |
| `site/src/three/robot.js` | Robot rig: materials, blink, expressions, LED visor banner |
| `site/src/lib/` | `scroll.js` (Lenis + one animation loop), `font5.js` (5×7 dot-matrix font) |
| `site/src/components/` | Page sections: Hero, BeyondCapital, Incubation, Process, Incubations (portfolio), Reviews, Team, Faq, Footer (CTA + footer) |
| `site/public/models/robot.glb` | Robot exported from Blender (Draco-compressed) |
| `blender/` | Robot source files (`robot_v001`–`robot_v009`), export, reference and build scripts |

Phones and tablets (under 1024px) get a static hero robot instead of the pipe journey.

Brand name, partners, projects, people, quotes and dates are placeholders.
