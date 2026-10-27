/* =========================================================
   Particle scene: one cloud of points that morphs between
   0 = gear (mechanical)  1 = neural net (AI)  2 = rising chart (consulting)
   Morphing runs on the GPU: each particle stores three target
   positions and the shader blends them with three weights.
   Public API: window.PortfolioScene = { setShape(i), setFocus(f), count }
   ========================================================= */
(function () {
  "use strict";
  var canvas = document.getElementById("scene");
  if (!canvas || !window.THREE) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isSmall = window.innerWidth < 860;
  var N = isSmall ? 5200 : 9000;

  // ---------- renderer / camera ----------
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    canvas.style.display = "none";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x05070d, 1);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 11);

  // ---------- helpers ----------
  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  // ---------- shape 0: spur gear with hub and spokes ----------
  function gearPoints(n) {
    var out = new Float32Array(n * 3);
    var teeth = 14, R = 2.6, toothH = 0.42, rIn = 0.65, hubR = 1.05, rimIn = 1.95, thick = 0.55;
    function rOuter(t) {
      // smoothed square wave for trapezoid-ish teeth
      var s = Math.sin(t * teeth);
      var sq = Math.tanh(s * 3.2) * 0.5 + 0.5;
      return R + toothH * sq;
    }
    for (var i = 0; i < n; i++) {
      var t = Math.random() * Math.PI * 2, x, y, z, r, pick = Math.random();
      if (pick < 0.34) {               // outer toothed rim, face + side
        if (Math.random() < 0.55) { r = rOuter(t); z = rand(-thick, thick) / 2; }
        else { r = rand(rimIn, rOuter(t)); z = (Math.random() < 0.5 ? -1 : 1) * thick / 2; }
      } else if (pick < 0.52) {        // inner edge of rim
        r = rimIn; z = rand(-thick, thick) / 2;
        if (Math.random() < 0.5) { r = rand(rimIn, rimIn + 0.25); z = (Math.random() < 0.5 ? -1 : 1) * thick / 2; }
      } else if (pick < 0.74) {        // hub
        if (Math.random() < 0.5) { r = Math.random() < 0.5 ? hubR : rIn; z = rand(-thick, thick) * 0.65; }
        else { r = rand(rIn, hubR); z = (Math.random() < 0.5 ? -1 : 1) * thick * 0.65; }
      } else {                          // 5 spokes
        var k = Math.floor(Math.random() * 5);
        var a = (k / 5) * Math.PI * 2 + rand(-0.09, 0.09);
        r = rand(hubR, rimIn); t = a; z = rand(-thick, thick) * 0.32;
      }
      x = Math.cos(t) * r; y = Math.sin(t) * r;
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  }

  // ---------- shape 1: neural network ----------
  function netPoints(n) {
    var out = new Float32Array(n * 3);
    var layers = [4, 7, 9, 7, 3], spread = 1.75, nodes = [];
    layers.forEach(function (count, li) {
      var x = (li - (layers.length - 1) / 2) * spread, arr = [];
      for (var j = 0; j < count; j++) {
        var y = (j - (count - 1) / 2) * 0.62;
        var z = Math.sin(j * 1.7 + li) * 0.5;
        arr.push([x, y, z]);
      }
      nodes.push(arr);
    });
    for (var i = 0; i < n; i++) {
      var p;
      if (Math.random() < 0.42) {      // node spheres
        var L = nodes[Math.floor(Math.random() * nodes.length)];
        var c = L[Math.floor(Math.random() * L.length)];
        var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, rr = 0.15 * Math.cbrt(Math.random()) + 0.02;
        var s = Math.sqrt(1 - u * u);
        p = [c[0] + rr * s * Math.cos(th), c[1] + rr * s * Math.sin(th), c[2] + rr * u];
      } else {                          // edges between consecutive layers
        var li2 = Math.floor(Math.random() * (nodes.length - 1));
        var a = nodes[li2][Math.floor(Math.random() * nodes[li2].length)];
        var b = nodes[li2 + 1][Math.floor(Math.random() * nodes[li2 + 1].length)];
        var tt = Math.random();
        p = [a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt, a[2] + (b[2] - a[2]) * tt];
        p[0] += gauss() * 0.012; p[1] += gauss() * 0.012; p[2] += gauss() * 0.012;
      }
      out[i * 3] = p[0]; out[i * 3 + 1] = p[1]; out[i * 3 + 2] = p[2];
    }
    return out;
  }

  // ---------- shape 2: rising 3D bar chart + trend arrow ----------
  function chartPoints(n) {
    var out = new Float32Array(n * 3);
    var heights = [0.9, 1.5, 1.25, 2.1, 2.75, 3.6], w = 0.5, gap = 0.78, base = -1.9, depth = 0.5;
    var x0 = -((heights.length - 1) * gap) / 2;
    // trend polyline above bar tops
    var pts = heights.map(function (h, i) { return [x0 + i * gap, base + h + 0.45, 0]; });
    var tip = [pts[pts.length - 1][0] + 0.55, pts[pts.length - 1][1] + 0.55, 0];
    pts.push(tip);
    for (var i = 0; i < n; i++) {
      var r = Math.random(), x, y, z;
      if (r < 0.62) {                  // bar surfaces (box shells)
        var k = Math.floor(Math.random() * heights.length), h = heights[k], cx = x0 + k * gap;
        var face = Math.floor(Math.random() * 5);
        var u = rand(-w / 2, w / 2), v = rand(0, h), d = rand(-depth / 2, depth / 2);
        if (face === 0) { x = cx + u; y = base + v; z = depth / 2; }
        else if (face === 1) { x = cx + u; y = base + v; z = -depth / 2; }
        else if (face === 2) { x = cx - w / 2; y = base + v; z = d; }
        else if (face === 3) { x = cx + w / 2; y = base + v; z = d; }
        else { x = cx + u; y = base + h; z = d; }
      } else if (r < 0.84) {           // trend line
        var seg = Math.floor(Math.random() * (pts.length - 1)), a = pts[seg], b = pts[seg + 1], t = Math.random();
        x = a[0] + (b[0] - a[0]) * t + gauss() * 0.02;
        y = a[1] + (b[1] - a[1]) * t + gauss() * 0.02;
        z = gauss() * 0.02;
      } else if (r < 0.9) {            // arrow head
        var ang = Math.PI / 4, back = rand(0, 0.45), side = (Math.random() < 0.5 ? -1 : 1);
        x = tip[0] - Math.cos(ang + side * 0.6) * back; y = tip[1] - Math.sin(ang + side * 0.6) * back; z = gauss() * 0.02;
      } else {                          // base axis grid
        x = rand(x0 - 0.7, x0 + (heights.length - 1) * gap + 0.9);
        z = rand(-0.9, 0.9);
        y = base;
        if (Math.random() < 0.5) x = Math.round(x * 2.5) / 2.5; else z = Math.round(z * 2.5) / 2.5;
      }
      out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
    }
    return out;
  }

  // ---------- geometry ----------
  var geo = new THREE.BufferGeometry();
  var p0 = gearPoints(N), p1 = netPoints(N), p2 = chartPoints(N);
  var seeds = new Float32Array(N * 4);
  for (var i = 0; i < N; i++) {
    seeds[i * 4] = Math.random();               // brightness/size jitter
    seeds[i * 4 + 1] = Math.random() * 2 - 1;   // scatter dir x
    seeds[i * 4 + 2] = Math.random() * 2 - 1;   // scatter dir y
    seeds[i * 4 + 3] = Math.random() * 2 - 1;   // scatter dir z
  }
  geo.setAttribute("position", new THREE.BufferAttribute(p0, 3));
  geo.setAttribute("aP1", new THREE.BufferAttribute(p1, 3));
  geo.setAttribute("aP2", new THREE.BufferAttribute(p2, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));

  var uniforms = {
    uTime: { value: 0 },
    uGear: { value: 0 },
    uW: { value: new THREE.Vector3(1, 0, 0) },
    uScatter: { value: 0 },
    uOpacity: { value: 0 },
    uPixel: { value: renderer.getPixelRatio() },
    uC0: { value: new THREE.Color(0x22d3ee) },
    uC1: { value: new THREE.Color(0xa78bfa) },
    uC2: { value: new THREE.Color(0xfbbf24) }
  };

  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: [
      "attribute vec3 aP1; attribute vec3 aP2; attribute vec4 aSeed;",
      "uniform float uTime; uniform float uGear; uniform vec3 uW; uniform float uScatter; uniform float uPixel;",
      "uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;",
      "varying vec3 vColor; varying float vAlpha;",
      "void main(){",
      "  float gc = cos(uGear), gs = sin(uGear);",
      "  vec3 g = vec3(gc*position.x - gs*position.y, gs*position.x + gc*position.y, position.z);",
      "  vec3 p = g*uW.x + aP1*uW.y + aP2*uW.z;",
      "  vec3 dir = normalize(aSeed.yzw + 0.0001);",
      "  p += dir * uScatter * (1.2 + aSeed.x*2.2);",
      "  p += 0.035 * vec3(sin(uTime*0.9 + aSeed.x*40.0), cos(uTime*0.7 + aSeed.y*30.0), sin(uTime*0.8 + aSeed.z*20.0));",
      "  vec4 mv = modelViewMatrix * vec4(p,1.0);",
      "  gl_Position = projectionMatrix * mv;",
      "  float s = (0.9 + aSeed.x*1.6);",
      "  gl_PointSize = s * uPixel * (26.0 / -mv.z);",
      "  vec3 base = uC0*uW.x + uC1*uW.y + uC2*uW.z;",
      "  vColor = mix(base, vec3(1.0), aSeed.x*aSeed.x*0.55);",
      "  vAlpha = 0.45 + aSeed.x*0.55;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform float uOpacity; varying vec3 vColor; varying float vAlpha;",
      "void main(){",
      "  vec2 c = gl_PointCoord - 0.5; float d = length(c);",
      "  if(d > 0.5) discard;",
      "  float a = smoothstep(0.5, 0.0, d);",
      "  gl_FragColor = vec4(vColor, a*a*vAlpha*uOpacity);",
      "}"
    ].join("\n")
  });

  var cloud = new THREE.Points(geo, mat);
  var group = new THREE.Group();
  group.add(cloud);
  scene.add(group);

  // ---------- faint star dust ----------
  var dustN = isSmall ? 500 : 1100, dust = new Float32Array(dustN * 3);
  for (var d = 0; d < dustN; d++) {
    dust[d * 3] = rand(-18, 18); dust[d * 3 + 1] = rand(-11, 11); dust[d * 3 + 2] = rand(-14, 2);
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dust, 3));
  var dustMat = new THREE.PointsMaterial({ color: 0x5d6882, size: 0.025, transparent: true, opacity: 0.6, depthWrite: false });
  var dustPts = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPts);

  // ---------- state ----------
  var current = 0;
  var morph = { w0: 1, w1: 0, w2: 0, scatter: 0 };
  var focus = { v: 1 };            // 1 = hero (big, right side), 0 = background mode
  var mouse = { x: 0, y: 0 }, rot = { x: 0, y: 0 };

  function layout() {
    var w = window.innerWidth;
    isSmall = w < 860;
    var f = focus.v;
    // hero: shape sits to the right on wide screens, centred and pushed back on small ones
    var heroX = isSmall ? 0 : Math.min(3.6, 1.2 + w / 900);
    var heroY = isSmall ? 2.3 : 0;
    var heroS = isSmall ? 0.72 : 1.0;
    group.position.x = heroX * f + (isSmall ? 0 : 2.8) * (1 - f);
    group.position.y = heroY * f + 0 * (1 - f);
    var s = heroS * f + (isSmall ? 0.85 : 1.15) * (1 - f);
    group.scale.setScalar(s);
  }

  function setShape(i) {
    if (i === current) return;
    current = i;
    var target = { w0: i === 0 ? 1 : 0, w1: i === 1 ? 1 : 0, w2: i === 2 ? 1 : 0 };
    if (window.gsap && !reduceMotion) {
      gsap.to(morph, { w0: target.w0, w1: target.w1, w2: target.w2, duration: 1.6, ease: "power3.inOut", overwrite: "auto" });
      gsap.fromTo(morph, { scatter: 0 }, { scatter: 0.55, duration: 0.8, ease: "power2.out", yoyo: true, repeat: 1, overwrite: false });
    } else {
      morph.w0 = target.w0; morph.w1 = target.w1; morph.w2 = target.w2;
    }
    document.dispatchEvent(new CustomEvent("scene:shape", { detail: i }));
  }

  function setFocus(v) {
    if (window.gsap) gsap.to(focus, { v: v, duration: 1.2, ease: "power2.out", overwrite: "auto" });
    else focus.v = v;
  }

  var introOpacity = { v: 0 };
  function intro() {
    if (window.gsap) {
      gsap.fromTo(morph, { scatter: 3.5 }, { scatter: 0, duration: 2.4, ease: "expo.out" });
      gsap.to(introOpacity, { v: 1, duration: 1.6, ease: "power2.out" });
    } else { introOpacity.v = 1; }
  }

  window.addEventListener("pointermove", function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    uniforms.uPixel.value = renderer.getPixelRatio();
  });

  // ---------- loop ----------
  var clock = new THREE.Clock(), visible = true;
  document.addEventListener("visibilitychange", function () { visible = !document.hidden; });

  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    var t = clock.getElapsedTime();
    uniforms.uTime.value = reduceMotion ? 0 : t;
    uniforms.uW.value.set(morph.w0, morph.w1, morph.w2);
    uniforms.uScatter.value = morph.scatter;

    var f = focus.v;
    layout();
    uniforms.uOpacity.value = introOpacity.v * (0.42 + (isSmall ? 0.18 : 0.58) * f);

    // gentle idle spin (gear spins on its axis; others sway), plus mouse parallax
    rot.x += ((mouse.y * 0.25) - rot.x) * 0.04;
    rot.y += ((mouse.x * 0.45) - rot.y) * 0.04;
    var spin = reduceMotion ? 0 : t;
    group.rotation.x = -0.25 + rot.x + Math.sin(spin * 0.25) * 0.06;
    group.rotation.y = -0.35 + rot.y + Math.sin(spin * 0.2) * 0.25 * (1 - morph.w0);
    uniforms.uGear.value = spin * 0.18;
    dustPts.rotation.y = spin * 0.01;
    renderer.render(scene, camera);
  }
  tick();

  window.PortfolioScene = { setShape: setShape, setFocus: setFocus, intro: intro, count: N, get current() { return current; } };
})();
