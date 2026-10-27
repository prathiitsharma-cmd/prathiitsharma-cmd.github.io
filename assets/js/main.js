/* =========================================================
   Page behaviour: loader, hero modes, torn edges, reveals, nav.
   ========================================================= */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var S = window.PortfolioScene || { setShape: function () {}, intro: function () {}, current: 0, count: 0 };
  var hasGsap = !!window.gsap;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();

  // ---------- torn paper edges (random jagged clip-paths) ----------
  function tornPath(topOnly, amp, seed) {
    var rnd = (function (s) { return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })(seed);
    var steps = 46, top = [], bot = [];
    for (var i = 0; i <= steps; i++) {
      var x = (i / steps) * 100 + (i && i < steps ? (rnd() - 0.5) * 1.6 : 0);
      top.push(x.toFixed(2) + "% " + (rnd() * amp).toFixed(1) + "px");
      bot.push(x.toFixed(2) + "% calc(100% - " + (rnd() * amp).toFixed(1) + "px)");
    }
    var pts = top.concat(topOnly ? ["100% 100%", "0% 100%"] : bot.reverse());
    return "polygon(" + pts.join(",") + ")";
  }
  $$(".band, .foot").forEach(function (wrap, k) {
    var topOnly = wrap.classList.contains("foot");
    var fr = $(".band-fringe", wrap), blk = $(".band-black, .foot-black", wrap);
    if (fr) fr.style.clipPath = tornPath(topOnly, 22, 7 + k * 13);
    if (blk) blk.style.clipPath = tornPath(topOnly, 30, 11 + k * 17);
  });
  // paper tear that tucks the bottom of the portrait back into the page
  var tf = $(".band-tear-fringe"), tp = $(".band-tear-paper");
  if (tf) tf.style.clipPath = tornPath(true, 24, 101);
  if (tp) tp.style.clipPath = tornPath(true, 26, 211);
  function alignTear() { // line the tear's grid + texture up with the page background
    if (!tp) return;
    var r = tp.getBoundingClientRect(), x = r.left + window.scrollX, y = r.top + window.scrollY;
    tp.style.backgroundPosition = [-x + "px " + -y + "px", -x + "px " + -y + "px", -x + "px " + -y + "px"].join(",");
  }
  alignTear(); window.addEventListener("resize", alignTear); window.addEventListener("load", alignTear);

  // ---------- loader ----------
  var loader = $("#loader"), pct = $("#loaderPct"), start = performance.now(), minT = reduceMotion ? 200 : 1300, loaded = false;
  window.addEventListener("load", function () { loaded = true; });
  setTimeout(function () { loaded = true; }, 5000);
  (function step(now) {
    var p = Math.min(1, (now - start) / minT); if (!loaded) p = Math.min(p, 0.92);
    var v = Math.round((1 - Math.pow(1 - p, 3)) * 100);
    pct.textContent = ("00" + v).slice(-3);
    if (p < 1 || !loaded) requestAnimationFrame(step); else setTimeout(done, 200);
  })(start);
  function done() {
    loader.classList.add("done"); document.body.classList.remove("is-loading");
    S.intro(); heroIntro(); startCycle();
  }

  function heroIntro() {
    if (!hasGsap || reduceMotion) return;
    gsap.from(".ht-word", { yPercent: 105, duration: 1.1, ease: "expo.out", stagger: 0.1, delay: 0.25 });
    gsap.from(".hero-row > *, .glyph-row, .logos, .annot", { opacity: 0, y: 18, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.55 });
  }

  // ---------- modes + annotations ----------
  var notes = ["my pintle injector, in 9,000 dots", "a neural net (it's thinking)", "production is just gears, really", "the line goes up. that's consulting"];
  var annot = $("#annotText"), modes = $$(".mode");
  document.addEventListener("scene:shape", function (e) {
    var i = e.detail;
    modes.forEach(function (m) { var on = +m.dataset.shape === i; m.classList.toggle("active", on); m.setAttribute("aria-selected", on ? "true" : "false"); });
    if (annot) { annot.style.opacity = 0; setTimeout(function () { annot.textContent = notes[i]; annot.style.opacity = 1; }, 300); }
  });
  var timer = null;
  function startCycle() {
    if (reduceMotion) return;
    clearInterval(timer);
    timer = setInterval(function () { S.setShape((S.current + 1) % 4); }, 5200);
  }
  modes.forEach(function (m) { m.addEventListener("click", function () { S.setShape(+m.dataset.shape); startCycle(); }); });

  // ---------- top bar ----------
  var bar = $("#topbar");
  function onScroll() { bar.classList.toggle("scrolled", (window.scrollY || 0) > 20); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var burger = $("#burger");
  burger.addEventListener("click", function () {
    var open = bar.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$(".tb-nav a").forEach(function (a) { a.addEventListener("click", function () { bar.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; }); });
  if ("IntersectionObserver" in window) {
    var links = $$(".tb-nav a");
    var so = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) links.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id); }); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(function (s) { so.observe(s); });
  }

  // ---------- reveals ----------
  var rv = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, idx = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.transitionDelay = Math.min(idx, 6) * 60 + "ms"; el.classList.add("in"); ro.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    rv.forEach(function (el) { ro.observe(el); });
  } else rv.forEach(function (el) { el.classList.add("in"); });

  // ---------- services rows: tap to highlight on touch ----------
  $$(".svc-row").forEach(function (r) {
    r.addEventListener("click", function () { $$(".svc-row").forEach(function (o) { o.classList.toggle("active", o === r); }); S.setShape(+r.dataset.shape); });
  });

  // ---------- stacked cards: earlier cards shrink + dim as the next one covers them ----------
  if (hasGsap && window.ScrollTrigger && !reduceMotion && window.innerWidth > 860) {
    var cards = $$(".card");
    cards.forEach(function (c, i) {
      if (i === cards.length - 1) return;
      gsap.to(c, {
        scale: 0.96, filter: "brightness(0.9)", ease: "none",
        scrollTrigger: { trigger: cards[i + 1], start: "top 70%", end: "top " + (84 + (i + 1) * 14) + "px", scrub: true }
      });
    });
  }

  // ---------- marquee speeds up while scrolling ----------
  if (hasGsap && !reduceMotion) {
    var track = $(".bm-track");
    if (track && window.ScrollTrigger) {
      gsap.to(".band-marquee", { xPercent: -8, ease: "none", scrollTrigger: { trigger: ".band", start: "top bottom", end: "bottom top", scrub: true } });
      // portrait rises and grows out of the torn band as it scrolls into view
      gsap.fromTo(".portrait", { yPercent: 18, scale: 0.86 }, { yPercent: 0, scale: 1.04, ease: "none", scrollTrigger: { trigger: ".band", start: "top 95%", end: "center 45%", scrub: true } });
    }
  }
})();
