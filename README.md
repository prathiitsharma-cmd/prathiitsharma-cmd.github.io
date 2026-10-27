# prathiitsharma-cmd.github.io

Source for my portfolio: **https://prathiitsharma-cmd.github.io**

Paper edition: crumpled graph paper, ink black and signal red, with heavy expanded type, a torn-paper band, polaroid project shots and stacked project cards. Static HTML/CSS/JS, no build step.

The hero object is ~9,000 particles that morph on the GPU between four shapes, one per theme of my work:

| Shape | Theme | Source |
|---|---|---|
| Pintle injector assembly | Mechanical | sampled from the edges of my own STEP file (`assets/data/pintle.bin`) |
| Neural network | AI & computation | generated |
| Three meshing gears (they turn) | Production | generated |
| Rising bar chart | Consulting | generated |

The canvas uses `mix-blend-mode: difference`, so dots read as ink on the paper and invert over the black headline.

## Layout

```
index.html              all content
assets/css/style.css    styles (responsive, reduced-motion aware)
assets/js/scene.js      Three.js particle scene + morph shader
assets/js/main.js       loader, torn edges, modes, reveals, stacked cards, nav
assets/data/pintle.bin  9,000 xyz float32 points from the pintle CAD
assets/img/             photos, project figures, paper texture, social image
assets/vendor/          three.js r128, GSAP 3.12.5 + ScrollTrigger
resume.pdf
```

## Run locally

```bash
python -m http.server 8000   # then open http://localhost:8000
```

© Prathit Sharma. Code is free to learn from; please don't republish the content or photos as your own.
