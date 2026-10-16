/* Alae Rhazouani — backdrop, reveals, glass highlight, small interactions. */
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ── Deep-space backdrop ──────────────────────────────────────
  // Rendered once per resize, not per frame: nebula dust, a Milky Way
  // band with dust lanes, stars with real colour temperatures, and a
  // night-side planet limb at orbital sunrise. Only parallax moves.
  var space = document.createElement('div');
  space.className = 'space';
  space.setAttribute('aria-hidden', 'true');
  space.innerHTML = '<canvas class="sky"></canvas><canvas class="planet"></canvas>';
  document.body.insertBefore(space, document.body.firstChild);
  var skyCanvas = space.querySelector('.sky');
  var planetCanvas = space.querySelector('.planet');
  var MARGIN = 60;   // spare sky around the viewport for parallax

  // Seeded random, so the same sky appears on every page
  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  // Value noise summed over octaves (fbm), roughly 0..1
  function makeNoise(rand) {
    var perm = new Uint8Array(512), vals = new Float32Array(256), i, j, t;
    for (i = 0; i < 256; i++) { perm[i] = i; vals[i] = rand(); }
    for (i = 255; i > 0; i--) { j = Math.floor(rand() * (i + 1)); t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (i = 0; i < 256; i++) perm[256 + i] = perm[i];
    function noise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      xi &= 255; yi &= 255;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = vals[perm[xi + perm[yi]]], b = vals[perm[xi + 1 + perm[yi]]];
      var c = vals[perm[xi + perm[yi + 1]]], d = vals[perm[xi + 1 + perm[yi + 1]]];
      var top = a + (b - a) * u, bottom = c + (d - c) * u;
      return top + (bottom - top) * v;
    }
    return function (x, y, octaves) {
      var sum = 0, amp = 0.5, f = 1;
      for (var o = 0; o < octaves; o++) { sum += amp * noise(x * f, y * f); f *= 2; amp *= 0.5; }
      return sum / (1 - Math.pow(0.5, octaves));
    };
  }

  // Spectral classes O/B to M, weighted toward white and yellow-white
  var STAR_TINTS = [[155, 176, 255, .03], [170, 191, 255, .09], [202, 215, 255, .2], [248, 247, 255, .3], [255, 244, 234, .2], [255, 210, 161, .13], [255, 204, 111, .05]];
  function tint(r) {
    for (var i = 0, acc = 0; i < STAR_TINTS.length; i++) {
      acc += STAR_TINTS[i][3];
      if (r <= acc) return STAR_TINTS[i];
    }
    return STAR_TINTS[3];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function renderSky() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth + MARGIN * 2, h = window.innerHeight + MARGIN * 2;
    skyCanvas.width = Math.round(w * dpr);
    skyCanvas.height = Math.round(h * dpr);
    skyCanvas.style.width = w + 'px';
    skyCanvas.style.height = h + 'px';
    var ctx = skyCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var rand = rng(20260716), fbm = makeNoise(rand);

    // Dust and Milky Way at quarter resolution, upscaled smoothly
    var q = 4, qw = Math.ceil(w / q), qh = Math.ceil(h / q);
    var off = document.createElement('canvas');
    off.width = qw;
    off.height = qh;
    var octx = off.getContext('2d'), img = octx.createImageData(qw, qh), data = img.data;
    var bx = 0.05 * qw, by = 1.1 * qh, ex = 1.0 * qw, ey = -0.15 * qh;   // band axis
    var lx = ex - bx, ly = ey - by, len = Math.hypot(lx, ly);
    lx /= len; ly /= len;
    var bandW = Math.min(qw, qh) * 0.2;
    for (var y = 0; y < qh; y++) {
      for (var x = 0; x < qw; x++) {
        var dist = (x - bx) * ly - (y - by) * lx;
        var band = Math.exp(-(dist * dist) / (2 * bandW * bandW));
        var n = fbm(x / 55, y / 55, 5);
        var wob = dist + bandW * 0.5 * (fbm(x / 30 + 50, y / 30, 3) - 0.5);
        var lane = Math.exp(-(wob * wob) / (2 * Math.pow(bandW * 0.16, 2)));
        var milky = band * Math.pow(n, 1.6) * (1 - 0.8 * lane * fbm(x / 12, y / 12 + 30, 3));
        var neb = Math.pow(fbm(x / 95 + 13, y / 95 + 7, 5), 3);
        var k = (y * qw + x) * 4;
        data[k]     = 30 * neb + 200 * milky;
        data[k + 1] = 70 * neb + 205 * milky;
        data[k + 2] = 150 * neb + 230 * milky;
        data[k + 3] = 255 * Math.min(1, 0.5 * neb + 0.45 * milky);
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.85;
    ctx.drawImage(off, 0, 0, w, h);

    function dot(x, y, r, a, c) {
      ctx.globalAlpha = a;
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.283);
      ctx.fill();
    }

    // Faint field: most stars are dim
    var area = w * h, i, m;
    for (i = 0; i < area / 800; i++) {
      m = Math.pow(rand(), 3);
      dot(rand() * w, rand() * h, 0.3 + m * 0.75, 0.12 + m * 0.6, tint(rand()));
    }
    // Extra density along the band
    for (i = 0; i < area / 900; i++) {
      var t = rand(), across = (rand() + rand() + rand() - 1.5) * bandW * q * 0.8;
      var sx = (bx + lx * len * t) * q + ly * across;
      var sy = (by + ly * len * t) * q - lx * across;
      dot(sx, sy, 0.25 + rand() * 0.4, 0.1 + rand() * 0.4, tint(rand()));
    }
    // A few bright stars with bloom; the brightest get faint diffraction spikes
    var bright = Math.max(8, Math.round(area / 50000));
    for (i = 0; i < bright; i++) {
      var x0 = rand() * w, y0 = rand() * h, r0 = 0.8 + rand() * 0.8, c = tint(rand());
      var glow = ctx.createRadialGradient(x0, y0, 0, x0, y0, r0 * 8);
      glow.addColorStop(0, rgba(c, 0.55));
      glow.addColorStop(0.2, rgba(c, 0.12));
      glow.addColorStop(1, rgba(c, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.fillRect(x0 - r0 * 8, y0 - r0 * 8, r0 * 16, r0 * 16);
      dot(x0, y0, r0, 0.95, [255, 255, 255]);
      if (i < 4) {
        var L = r0 * 16;
        var gh = ctx.createLinearGradient(x0 - L, y0, x0 + L, y0);
        gh.addColorStop(0, rgba(c, 0)); gh.addColorStop(0.5, rgba(c, 0.45)); gh.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = gh;
        ctx.fillRect(x0 - L, y0 - 0.35, L * 2, 0.7);
        var gv = ctx.createLinearGradient(x0, y0 - L, x0, y0 + L);
        gv.addColorStop(0, rgba(c, 0)); gv.addColorStop(0.5, rgba(c, 0.45)); gv.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = gv;
        ctx.fillRect(x0 - 0.35, y0 - L, 0.7, L * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function renderPlanet() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth + 40, vh = window.innerHeight;
    var visible = Math.max(48, Math.min(96, vh * 0.09));
    var hgt = Math.round(visible + 240);
    planetCanvas.width = Math.round(w * dpr);
    planetCanvas.height = Math.round(hgt * dpr);
    planetCanvas.style.width = w + 'px';
    planetCanvas.style.height = hgt + 'px';
    var ctx = planetCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var R = Math.max(w, vh) * 2.4, cx = w / 2, horizon = hgt - visible, cy = horizon + R;
    var limbY = function (x) { return cy - Math.sqrt(R * R - (x - cx) * (x - cx)); };
    var rand = rng(7031), fbm = makeNoise(rand);

    // Atmospheric scattering above the limb
    var haze = ctx.createRadialGradient(cx, cy, R - 1, cx, cy, R + 90);
    haze.addColorStop(0, 'rgba(160,220,255,0.5)');
    haze.addColorStop(0.03, 'rgba(95,170,250,0.32)');
    haze.addColorStop(0.2, 'rgba(45,110,215,0.12)');
    haze.addColorStop(1, 'rgba(20,60,160,0)');
    ctx.fillStyle = haze;
    ctx.beginPath(); ctx.arc(cx, cy, R + 90, 0, 6.283); ctx.fill();

    // Night side
    var body = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, Math.max(w * 0.75, 420));
    body.addColorStop(0, '#0b1828');
    body.addColorStop(0.45, '#060d18');
    body.addColorStop(1, '#03060c');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();

    // Air glow just inside the limb
    var inner = ctx.createRadialGradient(cx, cy, R - 30, cx, cy, R);
    inner.addColorStop(0, 'rgba(70,140,230,0)');
    inner.addColorStop(1, 'rgba(110,185,255,0.3)');
    ctx.fillStyle = inner;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();

    // City lights, clustered, thinning away from the limb
    for (var i = 0; i < w / 2.5; i++) {
      var x = rand() * w;
      if (fbm(x / 70, 3.3, 4) < 0.55) continue;
      var depth = Math.pow(rand(), 1.7) * visible * 0.85;
      var y = limbY(x) + 5 + depth;
      ctx.globalAlpha = (0.2 + rand() * 0.5) * (1 - depth / visible);
      ctx.fillStyle = rand() < 0.8 ? '#ffcf8a' : '#fff1d6';
      ctx.fillRect(x, y, 0.8 + rand() * 0.7, 0.6);
    }
    ctx.globalAlpha = 1;

    // The limb itself
    ctx.save();
    ctx.strokeStyle = 'rgba(205,236,255,0.85)';
    ctx.lineWidth = 1.1;
    ctx.shadowColor = 'rgba(140,210,255,0.9)';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
    ctx.restore();

    // Orbital sunrise just over the limb
    var sx = w * 0.8, sy = limbY(sx) - 1;
    ctx.globalCompositeOperation = 'lighter';
    var sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, 180);
    sun.addColorStop(0, 'rgba(255,244,228,0.55)');
    sun.addColorStop(0.08, 'rgba(255,214,170,0.22)');
    sun.addColorStop(0.35, 'rgba(120,180,255,0.07)');
    sun.addColorStop(1, 'rgba(60,120,255,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(sx - 180, sy - 180, 360, 360);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(7, 0.5);
    var streak = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
    streak.addColorStop(0, 'rgba(255,240,220,0.45)');
    streak.addColorStop(1, 'rgba(255,220,180,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(-40, -40, 80, 80);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  // Film grain, generated once and tiled
  (function () {
    var g = document.createElement('canvas');
    g.width = g.height = 140;
    var gc = g.getContext('2d'), gi = gc.createImageData(140, 140), gd = gi.data, r = rng(99);
    for (var i = 0; i < gd.length; i += 4) {
      var v = r() * 255;
      gd[i] = gd[i + 1] = gd[i + 2] = v;
      gd[i + 3] = 14;
    }
    gc.putImageData(gi, 0, 0);
    space.style.setProperty('--grain', 'url(' + g.toDataURL() + ')');
  }());

  // Parallax: the whole sky shifts a few pixels with pointer and scroll
  var px = 0, py = 0, tx = 0, ty = 0, ticking = false;
  function place() {
    ticking = false;
    px += (tx - px) * 0.08;
    py += (ty - py) * 0.08;
    var scroll = Math.min(window.scrollY * 0.02, MARGIN - 14);
    skyCanvas.style.transform = 'translate3d(' + (-MARGIN + px * 24).toFixed(1) + 'px,' + (-MARGIN + py * 18 - scroll).toFixed(1) + 'px,0)';
    planetCanvas.style.transform = 'translate3d(' + (-20 + px * 10).toFixed(1) + 'px,0,0)';
    if (Math.abs(tx - px) + Math.abs(ty - py) > 0.001) request();
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(place); } }

  renderSky();
  renderPlanet();
  place();
  // Re-render when the viewport really changes size (window resize, or a
  // scrollbar appearing once fonts and images have loaded)
  var resizeTimer, lastW = window.innerWidth, lastH = window.innerHeight;
  function maybeRerender() {
    if (window.innerWidth === lastW && window.innerHeight === lastH) return;
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { renderSky(); renderPlanet(); place(); }, 150);
  }
  window.addEventListener('resize', maybeRerender);
  if ('ResizeObserver' in window) new ResizeObserver(maybeRerender).observe(space);
  if (!reduce) {
    window.addEventListener('scroll', request, { passive: true });
    if (finePointer) {
      window.addEventListener('pointermove', function (e) {
        tx = e.clientX / window.innerWidth - 0.5;
        ty = e.clientY / window.innerHeight - 0.5;
        request();
      }, { passive: true });
    }
  }

  // ── Orbit satellite (SMIL) respects reduced motion ───────────
  document.querySelectorAll('.orbit').forEach(function (svg) {
    if (reduce && svg.pauseAnimations) svg.pauseAnimations();
  });

  // ── Current page in the top bar ──────────────────────────────
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(function (a) {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });

  // ── Scroll progress ──────────────────────────────────────────
  var bar = document.createElement('div');
  bar.className = 'progress';
  document.body.appendChild(bar);
  function progress() {
    var max = doc.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  }
  window.addEventListener('scroll', progress, { passive: true });
  window.addEventListener('resize', progress);
  progress();

  // ── Glass: highlight follows the pointer ─────────────────────
  if (finePointer) {
    document.querySelectorAll('.glass').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      });
    });
  }

  // ── Reveal on scroll ─────────────────────────────────────────
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      '.page > *, .timeline > article, .projects > article, .gallery figure, .toc li, .hero-id > *, .socials'
    );
    targets.forEach(function (el) { el.classList.add('reveal'); });
    doc.classList.add('js-reveal');
    void document.body.offsetHeight;   // commit the hidden state first

    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--d', Math.min(n++ * 0.08, 0.4) + 's');
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

    var shown = 0;
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.style.setProperty('--d', Math.min(shown++ * 0.07, 0.7) + 's');
        el.classList.add('in');
      } else {
        io.observe(el);
      }
    });
  }

  // ── Copy email ───────────────────────────────────────────────
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var label = btn.querySelector('span');
    btn.addEventListener('click', function () {
      var done = function () {
        label.textContent = 'Copied';
        setTimeout(function () { label.textContent = 'Copy address'; }, 1800);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(done, function () {});
      }
    });
  });

  // ── Gallery lightbox ─────────────────────────────────────────
  var box = document.querySelector('.lightbox');
  if (box && box.showModal) {
    var boxImg = box.querySelector('img');
    var boxCap = box.querySelector('p');
    document.querySelectorAll('.gallery button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var img = btn.querySelector('img');
        boxImg.src = img.src;
        boxImg.alt = img.alt;
        boxCap.textContent = btn.parentElement.querySelector('figcaption').textContent;
        box.showModal();
      });
    });
    box.addEventListener('click', function () { box.close(); });
  }

  // ── Fade between internal pages ──────────────────────────────
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || e.defaultPrevented || a.target || a.hasAttribute('download')) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = a.getAttribute('href');
    if (!href || !/^[\w-]+\.html(#.*)?$/.test(href)) return;
    e.preventDefault();
    doc.classList.add('leaving');
    setTimeout(function () { location.href = href; }, reduce ? 0 : 220);
  });
  window.addEventListener('pageshow', function () { doc.classList.remove('leaving'); });
}());
