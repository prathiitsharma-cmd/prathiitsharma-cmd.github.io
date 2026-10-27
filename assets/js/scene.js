/* =========================================================
   Hero particle object, drawn in ink on paper.
   One point cloud morphs between four shapes:
     0 = Mechanical  -> my pintle-injector CAD (sampled from the STEP file's edges)
     1 = AI          -> neural network
     2 = Production  -> three meshing gears (they turn)
     3 = Consulting  -> rising bar chart
   Morphing runs in the vertex shader (four targets, four weights).
   API: window.PortfolioScene = { setShape(i), intro(), current, count }
   ========================================================= */
(function () {
  "use strict";
  var canvas = document.getElementById("scene");
  if (!canvas || !window.THREE) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.innerWidth < 860;
  var N = small ? 6000 : 9000;

  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, premultipliedAlpha: false }); }
  catch (e) { canvas.style.display = "none"; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 13);

  function size() {
    var w = canvas.clientWidth || 600, h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  // ---------- gear outline helper (used by fallback + production) ----------
  function gearSample(R, teeth, toothH, rIn, thick) {
    var t = Math.random() * Math.PI * 2, r, z, k = Math.random();
    var rOut = function (a) { return R + toothH * (Math.tanh(Math.sin(a * teeth) * 3.2) * 0.5 + 0.5); };
    if (k < 0.5) { r = rOut(t); z = rand(-thick, thick) / 2; }
    else if (k < 0.75) { r = rand(R * 0.78, rOut(t)); z = (Math.random() < 0.5 ? -1 : 1) * thick / 2; }
    else if (k < 0.9) { r = rIn; z = rand(-thick, thick) / 2; }
    else { r = rand(rIn, R * 0.78); z = (Math.random() < 0.5 ? -1 : 1) * thick / 2; t = Math.round(t / (Math.PI / 3)) * (Math.PI / 3) + rand(-0.05, 0.05); }
    return [Math.cos(t) * r, Math.sin(t) * r, z];
  }

  // ---------- shape 0 fallback: single gear (replaced by CAD cloud when it loads) ----------
  function fallbackGear(n) {
    var out = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { var p = gearSample(2.4, 14, 0.4, 0.6, 0.6); out.set(p, i * 3); }
    return out;
  }

  // ---------- shape 1: neural network ----------
  function netPoints(n) {
    var out = new Float32Array(n * 3), layers = [4, 7, 9, 7, 3], spread = 1.45, nodes = [];
    layers.forEach(function (count, li) {
      var x = (li - (layers.length - 1) / 2) * spread, arr = [];
      for (var j = 0; j < count; j++) arr.push([x, (j - (count - 1) / 2) * 0.55, Math.sin(j * 1.7 + li) * 0.45]);
      nodes.push(arr);
    });
    for (var i = 0; i < n; i++) {
      var p;
      if (Math.random() < 0.45) {
        var L = nodes[(Math.random() * nodes.length) | 0], c = L[(Math.random() * L.length) | 0];
        var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, rr = 0.15, s = Math.sqrt(1 - u * u);
        p = [c[0] + rr * s * Math.cos(th), c[1] + rr * s * Math.sin(th), c[2] + rr * u];
      } else {
        var li2 = (Math.random() * (nodes.length - 1)) | 0;
        var a = nodes[li2][(Math.random() * nodes[li2].length) | 0], b = nodes[li2 + 1][(Math.random() * nodes[li2 + 1].length) | 0], t = Math.random();
        p = [a[0] + (b[0] - a[0]) * t + gauss() * 0.01, a[1] + (b[1] - a[1]) * t + gauss() * 0.01, a[2] + (b[2] - a[2]) * t];
      }
      out.set(p, i * 3);
    }
    return out;
  }

  // ---------- shape 2: gear train (per-particle gear centre + speed so they spin) ----------
  var GEARS = [
    { cx: -1.25, cy: 0.55, R: 1.45, teeth: 18, speed: 0.5, phase: 0 },
    { cx: 1.35, cy: 0.75, R: 1.0, teeth: 12, speed: -0.75, phase: 0.13 },
    { cx: 0.35, cy: -1.75, R: 0.82, teeth: 10, speed: -0.9, phase: 0.2 }
  ];
  function trainPoints(n) {
    var pos = new Float32Array(n * 3), meta = new Float32Array(n * 3);
    var areas = GEARS.map(function (g) { return g.R * g.R; }), tot = areas.reduce(function (a, b) { return a + b; });
    for (var i = 0; i < n; i++) {
      var r = Math.random() * tot, k = 0; while (r > areas[k]) { r -= areas[k]; k++; }
      var g = GEARS[k], p = gearSample(g.R, g.teeth, 0.24, g.R * 0.28, 0.5);
      var c = Math.cos(g.phase), s = Math.sin(g.phase);
      pos[i * 3] = p[0] * c - p[1] * s; pos[i * 3 + 1] = p[0] * s + p[1] * c; pos[i * 3 + 2] = p[2];
      meta[i * 3] = g.cx; meta[i * 3 + 1] = g.cy; meta[i * 3 + 2] = g.speed;
    }
    return { pos: pos, meta: meta };
  }

  // ---------- shape 3: rising bar chart + trend arrow ----------
  function chartPoints(n) {
    var out = new Float32Array(n * 3), H = [0.9, 1.5, 1.2, 2.1, 2.7, 3.5], w = 0.48, gap = 0.74, base = -1.85, dep = 0.48;
    var x0 = -((H.length - 1) * gap) / 2;
    var pts = H.map(function (h, i) { return [x0 + i * gap, base + h + 0.4]; }); var tip = [pts[5][0] + 0.5, pts[5][1] + 0.5]; pts.push(tip);
    for (var i = 0; i < n; i++) {
      var r = Math.random(), x, y, z;
      if (r < 0.6) {
        var k = (Math.random() * H.length) | 0, h = H[k], cx = x0 + k * gap, f = (Math.random() * 5) | 0;
        var u = rand(-w / 2, w / 2), v = rand(0, h), d = rand(-dep / 2, dep / 2);
        if (f === 0) { x = cx + u; y = base + v; z = dep / 2; } else if (f === 1) { x = cx + u; y = base + v; z = -dep / 2; }
        else if (f === 2) { x = cx - w / 2; y = base + v; z = d; } else if (f === 3) { x = cx + w / 2; y = base + v; z = d; }
        else { x = cx + u; y = base + h; z = d; }
      } else if (r < 0.84) {
        var sg = (Math.random() * (pts.length - 1)) | 0, a = pts[sg], b = pts[sg + 1], t = Math.random();
        x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t; z = gauss() * 0.02;
      } else if (r < 0.9) {
        var back = rand(0, 0.42), side = Math.random() < 0.5 ? -1 : 1, ang = Math.PI / 4 + side * 0.6;
        x = tip[0] - Math.cos(ang) * back; y = tip[1] - Math.sin(ang) * back; z = 0;
      } else {
        x = rand(x0 - 0.6, x0 + (H.length - 1) * gap + 0.8); z = rand(-0.8, 0.8); y = base;
        if (Math.random() < 0.5) x = Math.round(x * 2.5) / 2.5; else z = Math.round(z * 2.5) / 2.5;
      }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  }

  // ---------- geometry ----------
  var geo = new THREE.BufferGeometry();
  var train = trainPoints(N);
  var seeds = new Float32Array(N * 4);
  for (var i = 0; i < N; i++) { seeds[i * 4] = Math.random(); seeds[i * 4 + 1] = Math.random() * 2 - 1; seeds[i * 4 + 2] = Math.random() * 2 - 1; seeds[i * 4 + 3] = Math.random() * 2 - 1; }
  var p0Attr = new THREE.BufferAttribute(fallbackGear(N), 3);
  geo.setAttribute("position", p0Attr);
  geo.setAttribute("aP1", new THREE.BufferAttribute(netPoints(N), 3));
  geo.setAttribute("aP2", new THREE.BufferAttribute(train.pos, 3));
  geo.setAttribute("aGear", new THREE.BufferAttribute(train.meta, 3));
  geo.setAttribute("aP3", new THREE.BufferAttribute(chartPoints(N), 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);

  // swap shape 0 for the real CAD cloud (float32 xyz, 9000 points)
  fetch("assets/data/pintle.bin").then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (buf) {
    var src = new Float32Array(buf), M = src.length / 3, dst = p0Attr.array;
    for (var k = 0; k < N; k++) { var j = (k % M) * 3; dst[k * 3] = src[j]; dst[k * 3 + 1] = src[j + 2]; dst[k * 3 + 2] = src[j + 1]; }
    p0Attr.needsUpdate = true;
  }).catch(function () { /* keep the gear */ });

  var uniforms = {
    uTime: { value: 0 }, uW: { value: new THREE.Vector4(1, 0, 0, 0) }, uScatter: { value: 0 },
    uOpacity: { value: 0 }, uPixel: { value: renderer.getPixelRatio() }, uSize: { value: small ? 28 : 34 },
    // drawn in near-white + cyan and composited with CSS mix-blend-mode: difference,
    // so dots read as ink on paper and as light on the black headline (red on paper = cyan complement)
    uInk: { value: new THREE.Color(0xfafaf7) }, uRed: { value: new THREE.Color(0x09c8d1) }
  };

  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms, transparent: true, depthWrite: false,
    vertexShader: [
      "attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aGear; attribute vec4 aSeed;",
      "uniform float uTime; uniform vec4 uW; uniform float uScatter; uniform float uPixel; uniform float uSize;",
      "varying float vSeed; varying float vDepth;",
      "void main(){",
      "  float ang = uTime * aGear.z;",
      "  float c = cos(ang), s = sin(ang);",
      "  vec3 g = vec3(c*aP2.x - s*aP2.y + aGear.x, s*aP2.x + c*aP2.y + aGear.y, aP2.z);",
      "  vec3 p = position*uW.x + aP1*uW.y + g*uW.z + aP3*uW.w;",
      "  p += normalize(aSeed.yzw + 0.0001) * uScatter * (1.0 + aSeed.x*2.0);",
      "  p += 0.025 * vec3(sin(uTime*0.9 + aSeed.x*40.0), cos(uTime*0.7 + aSeed.y*30.0), sin(uTime*0.8 + aSeed.z*20.0));",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
      "  gl_Position = projectionMatrix * mv;",
      "  gl_PointSize = (0.75 + aSeed.x * 1.1) * uPixel * (uSize / -mv.z);",
      "  vSeed = aSeed.x; vDepth = clamp((-mv.z - 9.0) / 8.0, 0.0, 1.0);",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform float uOpacity; uniform vec3 uInk; uniform vec3 uRed;",
      "varying float vSeed; varying float vDepth;",
      "void main(){",
      "  float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;",
      "  float a = smoothstep(0.5, 0.38, d);",
      "  vec3 col = vSeed > 0.92 ? uRed : uInk;",
      "  gl_FragColor = vec4(col, a * uOpacity * (1.0 - vDepth * 0.25));",
      "}"
    ].join("\n")
  });

  var cloud = new THREE.Points(geo, mat);
  var group = new THREE.Group(); group.add(cloud); scene.add(group);

  // ---------- state ----------
  var current = 0, morph = { w0: 1, w1: 0, w2: 0, w3: 0, scatter: 0 }, fade = { v: 0 };
  var mouse = { x: 0, y: 0 }, rot = { x: 0, y: 0 };

  function setShape(i) {
    if (i === current) return;
    current = i;
    var t = { w0: +(i === 0), w1: +(i === 1), w2: +(i === 2), w3: +(i === 3) };
    if (window.gsap && !reduceMotion) {
      gsap.to(morph, { w0: t.w0, w1: t.w1, w2: t.w2, w3: t.w3, duration: 1.5, ease: "power3.inOut", overwrite: "auto" });
      gsap.fromTo(morph, { scatter: 0 }, { scatter: 0.45, duration: 0.75, ease: "power2.out", yoyo: true, repeat: 1, overwrite: false });
    } else { morph.w0 = t.w0; morph.w1 = t.w1; morph.w2 = t.w2; morph.w3 = t.w3; }
    document.dispatchEvent(new CustomEvent("scene:shape", { detail: i }));
  }
  function intro() {
    if (window.gsap && !reduceMotion) {
      gsap.fromTo(morph, { scatter: 4 }, { scatter: 0, duration: 2.2, ease: "expo.out" });
      gsap.to(fade, { v: 1, duration: 1.2 });
    } else fade.v = 1;
  }

  window.addEventListener("pointermove", function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener("resize", size);
  size();

  // render only while the hero is on screen
  var onScreen = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; }).observe(canvas);

  var clock = new THREE.Clock();
  (function tick() {
    requestAnimationFrame(tick);
    if (!onScreen || document.hidden) return;
    var t = reduceMotion ? 0 : clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uW.value.set(morph.w0, morph.w1, morph.w2, morph.w3);
    uniforms.uScatter.value = morph.scatter;
    uniforms.uOpacity.value = fade.v;
    rot.x += (mouse.y * 0.3 - rot.x) * 0.05;
    rot.y += (mouse.x * 0.5 - rot.y) * 0.05;
    // mechanical spins slowly on its axis; others sway
    var spinY = morph.w0 * t * 0.35 + (1 - morph.w0) * Math.sin(t * 0.3) * 0.3;
    group.rotation.x = 0.75 * morph.w0 - 0.12 * (1 - morph.w0) + rot.x;
    group.rotation.y = spinY + rot.y;
    renderer.render(scene, camera);
  })();

  window.PortfolioScene = { setShape: setShape, intro: intro, count: N, get current() { return current; } };
})();
