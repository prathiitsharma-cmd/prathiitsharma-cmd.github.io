# prathiitsharma-cmd.github.io

Source for my portfolio site: **https://prathiitsharma-cmd.github.io**

A single static page with no build step: HTML, CSS and vanilla JavaScript, with [Three.js](https://threejs.org) for the particle scene and [GSAP](https://gsap.com) for scroll animation. Both libraries are vendored in `assets/vendor/`, so the site has no runtime CDN dependency.

The hero is one cloud of ~9,000 particles that morphs on the GPU between three shapes, one per theme of my work:

| Shape | Theme |
|---|---|
| ⚙ Spur gear | Mechanical design |
| ◈ Neural network | AI & computation |
| ▲ Rising bar chart | Strategy & consulting |

Each particle stores all three target positions; the vertex shader blends them with three weights that GSAP tweens.

## Layout

```
index.html              all content
assets/css/style.css    styles (dark theme, responsive, reduced-motion aware)
assets/js/scene.js      Three.js particle scene + morph shader
assets/js/main.js       loader, typing roles, reveals, filters, nav
assets/vendor/          three.min.js r128, gsap 3.12.5, ScrollTrigger
assets/img/             favicon and social preview image
resume.pdf              current one-page resume
```

## Run locally

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Updating

- **Projects / experience:** edit the matching `<article>` in `index.html`. Project cards are filtered by their `data-tags` (`mech`, `ai`, `consult`).
- **Resume:** replace `resume.pdf`.
- **Shapes:** `gearPoints`, `netPoints` and `chartPoints` in `assets/js/scene.js`.

© Prathit Sharma. Code is free to learn from; please don't republish the content as your own.
