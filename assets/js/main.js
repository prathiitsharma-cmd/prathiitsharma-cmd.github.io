/* =========================================================
   Page behaviour: loader, hero, scroll reveals, filters, nav.
   ========================================================= */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var S = window.PortfolioScene || { setShape: function () {}, setFocus: function () {}, intro: function () {}, count: 0 };
  var hasGsap = !!window.gsap;
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- year + particle count ----------
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  var hc = $("#hudCount"); if (hc && S.count) hc.textContent = S.count.toLocaleString("en-IN");

  // ---------- loader ----------
  var loader = $("#loader"), pctEl = $("#loaderPct"), bar = $("#loaderBar");
  var start = performance.now(), minTime = reduceMotion ? 300 : 1500, loaded = false;
  window.addEventListener("load", function () { loaded = true; });
  setTimeout(function () { loaded = true; }, 5000); // never hang on a slow font

  function step(now) {
    var p = Math.min(1, (now - start) / minTime);
    if (!loaded) p = Math.min(p, 0.9);
    var eased = 1 - Math.pow(1 - p, 3);
    var v = Math.round(eased * 100);
    pctEl.textContent = v; bar.style.width = v + "%";
    if (p < 1 || !loaded) requestAnimationFrame(step);
    else setTimeout(finishLoading, 250);
  }
  requestAnimationFrame(step);

  function finishLoading() {
    loader.classList.add("done");
    document.body.classList.remove("is-loading");
    S.intro();
    heroIntro();
    startRoles();
    startCycle();
  }

  // ---------- hero intro ----------
  function heroIntro() {
    var heroReveals = $$(".hero .reveal");
    if (hasGsap && !reduceMotion) {
      gsap.from(".hero-title .word", { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.12, delay: 0.1 });
      heroReveals.forEach(function (el, i) {
        gsap.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.35 + i * 0.1, onComplete: function () { el.classList.add("in"); el.style.transform = ""; } });
      });
    } else {
      heroReveals.forEach(function (el) { el.classList.add("in"); });
    }
  }

  // ---------- typing roles ----------
  var roles = ["Mechanical Engineer", "Propulsion & Design", "Computational Modeller", "AI Builder", "Strategy Consultant"];
  var roleEl = $("#roleText");
  function startRoles() {
    if (!roleEl || reduceMotion) return;
    var ri = 0, ci = roleEl.textContent.length, deleting = true;
    (function loop() {
      var word = roles[ri];
      if (deleting) {
        ci--; roleEl.textContent = word.slice(0, ci);
        if (ci <= 0) { deleting = false; ri = (ri + 1) % roles.length; }
        setTimeout(loop, 38);
      } else {
        word = roles[ri]; ci++; roleEl.textContent = word.slice(0, ci);
        if (ci >= word.length) { deleting = true; setTimeout(loop, 2100); }
        else setTimeout(loop, 70);
      }
    })();
  }

  // ---------- shape cycling (hero) + HUD ----------
  var modes = ["ENGINEER", "COMPUTE", "CONSULT"], colors = ["var(--c1)", "var(--c2)", "var(--c3)"];
  var hudMode = $("#hudMode"), dots = $$(".hud-dot");
  document.addEventListener("scene:shape", function (e) {
    var i = e.detail;
    if (hudMode) { hudMode.textContent = modes[i]; hudMode.style.color = colors[i]; }
    dots.forEach(function (d) { d.classList.toggle("active", +d.dataset.shape === i); });
    $$(".pillar").forEach(function (p) { p.classList.toggle("active", +p.dataset.shape === i); });
  });
  if (hudMode) hudMode.style.color = colors[0];

  var cycleTimer = null, pinned = false;
  function startCycle() {
    if (reduceMotion) return;
    stopCycle();
    cycleTimer = setInterval(function () {
      if (pinned) return;
      S.setShape((S.current + 1) % 3);
    }, 4200);
  }
  function stopCycle() { if (cycleTimer) clearInterval(cycleTimer); cycleTimer = null; }
  dots.forEach(function (d) {
    d.addEventListener("click", function () { S.setShape(+d.dataset.shape); startCycle(); });
  });

  // pillars drive the shape while hovered / focused
  $$(".pillar").forEach(function (p) {
    p.setAttribute("tabindex", "0");
    var on = function () { pinned = true; S.setShape(+p.dataset.shape); };
    var off = function () { pinned = false; };
    p.addEventListener("mouseenter", on); p.addEventListener("focus", on);
    p.addEventListener("mouseleave", off); p.addEventListener("blur", off);
  });

  // ---------- scroll: focus of the 3D scene + nav state ----------
  var nav = $("#nav"), hero = $("#hero");
  function onScroll() {
    var sy = window.scrollY || window.pageYOffset;
    nav.classList.toggle("scrolled", sy > 30);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { S.setFocus(en.intersectionRatio > 0.35 ? 1 : 0); });
    }, { threshold: [0, 0.35, 0.6] }).observe(hero);
  }

  // active nav link
  var links = $$(".nav-links a");
  if ("IntersectionObserver" in window) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id); });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(function (s) { secObs.observe(s); });
  }

  // mobile menu
  var toggle = $("#navToggle");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  });
  links.forEach(function (l) {
    l.addEventListener("click", function () {
      nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); document.body.style.overflow = "";
    });
  });

  // ---------- reveal on scroll ----------
  var revealEls = $$(".reveal").filter(function (el) { return !el.closest(".hero"); });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var rObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          var sibs = Array.prototype.indexOf.call(el.parentNode.children, el);
          el.style.transitionDelay = Math.min(sibs, 5) * 70 + "ms";
          el.classList.add("in");
          rObs.unobserve(el);
          countUp(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { rObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); countUp(el); });
  }

  // ---------- count-up stats ----------
  function countUp(el) {
    var b = el.querySelector && el.querySelector("[data-count]");
    if (!b) return;
    var target = +b.dataset.count;
    if (reduceMotion || !hasGsap) { b.textContent = target.toLocaleString("en-IN"); return; }
    var o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.8, ease: "power3.out", onUpdate: function () { b.textContent = Math.round(o.v).toLocaleString("en-IN"); } });
  }

  // ---------- timeline fill ----------
  var fill = $("#timelineFill"), tl = $("#timeline");
  if (fill && tl) {
    if (hasGsap && window.ScrollTrigger && !reduceMotion) {
      gsap.to(fill, { height: "100%", ease: "none", scrollTrigger: { trigger: tl, start: "top 70%", end: "bottom 60%", scrub: 0.5 } });
    } else { fill.style.height = "100%"; }
  }

  // ---------- project filter ----------
  var filters = $$(".filter"), projects = $$(".project");
  filters.forEach(function (f) {
    f.addEventListener("click", function () {
      var key = f.dataset.filter;
      filters.forEach(function (x) { var on = x === f; x.classList.toggle("active", on); x.setAttribute("aria-selected", on ? "true" : "false"); });
      projects.forEach(function (p) {
        var show = key === "all" || p.dataset.tags.split(" ").indexOf(key) > -1;
        p.classList.toggle("hide", !show);
        if (show && hasGsap && !reduceMotion) gsap.fromTo(p, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
      });
      if (key === "mech") S.setShape(0);
      else if (key === "ai") S.setShape(1);
      else if (key === "consult") S.setShape(2);
    });
  });

  // ---------- card glow + tilt ----------
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && !reduceMotion) {
    projects.forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
        card.style.transform = "perspective(900px) rotateX(" + ((0.5 - py) * 4) + "deg) rotateY(" + ((px - 0.5) * 5) + "deg) translateY(-3px)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  // ---------- custom cursor ----------
  var cursor = $("#cursor");
  if (fine && cursor && !reduceMotion) {
    var cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; cursor.classList.add("on"); }, { passive: true });
    document.addEventListener("pointerleave", function () { cursor.classList.remove("on"); });
    (function move() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
      requestAnimationFrame(move);
    })();
    $$("a, button, .pillar, .project").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor.classList.add("hover"); });
      el.addEventListener("mouseleave", function () { cursor.classList.remove("hover"); });
    });
  }
})();
