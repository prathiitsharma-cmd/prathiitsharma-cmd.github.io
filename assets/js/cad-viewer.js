/* =========================================================
   CAD viewer: loads a GLB assembly, orbit / explode / section.
   Needs three.js r128 + GLTFLoader + OrbitControls (globals).
   Usage: CadViewer(containerEl, { src: "model.glb" })
   ========================================================= */
(function () {
  "use strict";
  function CadViewer(host, opts) {
    opts = opts || {};
    var THREE = window.THREE;
    var canvas = document.createElement("canvas");
    canvas.className = "cad-canvas";
    canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    host.insertBefore(canvas, host.firstChild);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.localClippingEnabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
    camera.position.set(3.3, 1.9, 3.5);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6f6a60, 0.6));
    var key = new THREE.DirectionalLight(0xffffff, 0.75); key.position.set(3, 5, 4); scene.add(key);
    var rim = new THREE.DirectionalLight(0xffffff, 0.35); rim.position.set(-4, 2, -3); scene.add(rim);

    // ground shadow disc
    var shadow = new THREE.Mesh(new THREE.CircleGeometry(1.0, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 }));
    shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1.15, 0.75, 1); shadow.position.y = 0.001; scene.add(shadow);

    var controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.autoRotate = opts.autoRotate !== false; controls.autoRotateSpeed = 0.8;
    controls.minDistance = 1.4; controls.maxDistance = 9;
    controls.enablePan = false;

    var clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);   // section plane (assembly Y = 0)
    var parts = [], center = new THREE.Vector3(), state = { explode: 0, section: false };

    function size() {
      var w = host.clientWidth || 600, h = host.clientHeight || 400;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", size); size();

    new THREE.GLTFLoader().load(opts.src, function (gltf) {
      var root = gltf.scene;
      var box = new THREE.Box3().setFromObject(root);
      box.getCenter(center);
      root.position.x -= center.x; root.position.z -= center.z; root.position.y -= box.min.y;
      clip.constant = -center.z; // keep the cut on the assembly centre-plane (Y = 0 in Fusion)
      root.updateMatrixWorld(true);
      var assemblyCentre = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
      var meshes = [];
      root.traverse(function (o) { if (o.isMesh) meshes.push(o); });
      meshes.forEach(function (o) {
        var base = o.material;
        var col = base.color ? base.color.clone() : new THREE.Color(0xbbbbbb);
        var front = new THREE.MeshStandardMaterial({ color: col, metalness: 0.5, roughness: 0.45, clippingPlanes: [], side: THREE.FrontSide });
        var back = new THREE.MeshBasicMaterial({ color: 0xe3241b, clippingPlanes: [], side: THREE.BackSide });
        o.material = front;
        var cap = new THREE.Mesh(o.geometry, back); o.add(cap);
        o.geometry.computeVertexNormals();
        var pb = new THREE.Box3().setFromObject(o), pc = pb.getCenter(new THREE.Vector3());
        var dir = pc.clone().sub(assemblyCentre); dir.y = Math.max(dir.y, 0) * 1.3 + 0.12; dir.x *= 0.9;
        parts.push({ mesh: o, start: o.position.clone(), dir: dir, mats: [front, back] });
      });
      scene.add(root);
      host.classList.add("cad-ready");
      apply();
      if (opts.onReady) opts.onReady(api);
    }, undefined, function () { host.classList.add("cad-error"); });

    function apply() {
      parts.forEach(function (p) {
        // dir is in world space; parent has no rotation/scale, so it maps 1:1
        p.mesh.position.copy(p.start).addScaledVector(p.dir, state.explode * 0.75);
        p.mats.forEach(function (m) { m.clippingPlanes = state.section ? [clip] : []; m.needsUpdate = true; });
      });
    }
    var api = {
      setExplode: function (v) { state.explode = v; apply(); },
      setSection: function (on) { state.section = on; apply(); },
      setAutoRotate: function (on) { controls.autoRotate = on; },
      view: function (name) {
        var d = 4.6, P = { iso: [3.3, 1.9, 3.5], front: [0, 0.55, d], side: [d, 0.55, 0], top: [0.001, d, 0.001], rear: [-3.3, 1.9, -3.5] }[name] || [3.3, 1.9, 3.5];
        camera.position.set(P[0], P[1], P[2]); controls.target.set(0, 0.5, 0); controls.update();
      },
      renderer: renderer
    };
    controls.target.set(0, 0.5, 0);

    var visible = true;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(host);
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      controls.update(); renderer.render(scene, camera);
    })();
    host.addEventListener("pointerdown", function () { controls.autoRotate = false; });
    return api;
  }
  window.CadViewer = CadViewer;
})();
