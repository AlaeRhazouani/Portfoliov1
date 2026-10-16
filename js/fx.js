/* Shared effects: liquid glass, ambient light, title and scroll motion. */
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  doc.classList.add('fx');
  // Only Chromium renders SVG filters inside backdrop-filter
  if (window.chrome) doc.classList.add('lg-refract');

  // ── Refraction filter used by .glass ─────────────────────────
  document.body.insertAdjacentHTML('beforeend',
    '<svg class="fx-defs" aria-hidden="true" focusable="false">' +
      '<filter id="fx-refract" x="0" y="0" width="100%" height="100%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.011 0.016" numOctaves="2" seed="7" result="noise"/>' +
        '<feGaussianBlur in="noise" stdDeviation="3" result="soft"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="soft" scale="14"xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
    '</svg>');

  // ── Ambient light layer ──────────────────────────────────────
  var ambient = document.createElement('div');
  ambient.className = 'fx-ambient';
  ambient.setAttribute('aria-hidden', 'true');
  ambient.innerHTML = '<i class="fx-blob b1"></i><i class="fx-blob b2"></i><i class="fx-blob b3"></i><i class="fx-cursor"></i>';
  document.body.appendChild(ambient);

  // ── Space: starfield, shooting stars, floating crew ──────────
  var sky = document.createElement('canvas');
  sky.className = 'fx-sky';
  ambient.insertBefore(sky, ambient.querySelector('.fx-cursor'));
  var ctx = sky.getContext('2d');
  var W = 0, H = 0, stars = [], meteor = null, nextMeteor = 4000;

  function seedSky() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    sky.width = Math.round(W * dpr);
    sky.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    var count = Math.round(W * H / 5000);
    for (var i = 0; i < count; i++) {
      var depth = Math.random();
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.35 + depth * depth * 1.5,
        depth: depth,
        a: 0.3 + Math.random() * 0.6,
        speed: 0.6 + Math.random() * 2.2,
        phase: Math.random() * 6.283,
        tint: Math.random() < 0.3 ? '#8fd0f5' : '#e4f2ff'
      });
    }
  }

  function drawSky(t) {
    ctx.clearRect(0, 0, W, H);
    var scroll = window.scrollY;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      // Nearer stars scroll faster for a little depth
      var y = ((s.y - scroll * (0.03 + s.depth * 0.12)) % H + H) % H;
      var a = reduce ? s.a : s.a * (0.6 + 0.4 * Math.sin(t * 0.001 * s.speed + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = s.tint;
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, 6.283);
      ctx.fill();
      if (s.r > 1.45) {
        ctx.globalAlpha = a * 0.35;
        ctx.fillRect(s.x - s.r * 3.2, y - 0.35, s.r * 6.4, 0.7);
        ctx.fillRect(s.x - 0.35, y - s.r * 3.2, 0.7, s.r * 6.4);
      }
    }
    if (meteor) {
      var m = meteor;
      var tail = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.22, m.y - m.vy * 0.22);
      tail.addColorStop(0, 'rgba(228, 242, 255, ' + m.life + ')');
      tail.addColorStop(1, 'rgba(55, 150, 208, 0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = tail;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 0.22, m.y - m.vy * 0.22);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function stepMeteor(dt) {
    nextMeteor -= dt * 1000;
    if (!meteor && nextMeteor <= 0) {
      var dir = Math.random() < 0.5 ? -1 : 1;
      meteor = { x: W * (0.2 + Math.random() * 0.6), y: H * Math.random() * 0.35, vx: dir * (500 + Math.random() * 300), vy: 260 + Math.random() * 160, life: 1 };
      nextMeteor = 6000 + Math.random() * 7000;
    }
    if (meteor) {
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;
      meteor.life -= dt * 1.1;
      if (meteor.life <= 0) meteor = null;
    }
  }

  var CREW_ART = {
    astronaut:
      '<svg viewBox="0 0 64 64" fill="none" stroke="#3796d0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="17" y="24" width="30" height="24" rx="7" fill="#0b1724"/>' +
        '<path d="M22 33 L12 39 M42 33 L51 25 M27 47 L25 57 M37 47 L40 56"/>' +
        '<circle cx="12" cy="39.5" r="2.2" fill="#3796d0"/><circle cx="51.5" cy="24.5" r="2.2" fill="#3796d0"/>' +
        '<rect x="21" y="28" width="22" height="21" rx="8" fill="#0d1b2a"/>' +
        '<rect x="27" y="35" width="10" height="6" rx="1.5" stroke-width="1.6"/>' +
        '<circle cx="32" cy="19" r="12" fill="#0d1b2a"/>' +
        '<path d="M24 18 a8 6 0 0 1 16 0 v1 a8 6 0 0 1 -16 0z" fill="#8fd0f5" fill-opacity=".3" stroke="#8fd0f5"/>' +
        '<path d="M27.5 15.5 q2 -2.6 5 -2.8" stroke="#fff" stroke-width="1.6" opacity=".85"/>' +
      '</svg>',
    rocket:
      '<svg viewBox="0 0 64 64" fill="none" stroke="#3796d0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<path class="fx-flame" d="M27 47 Q32 63 37 47" fill="#8fd0f5" fill-opacity=".85" stroke="#8fd0f5" stroke-width="1.6"/>' +
        '<path d="M24 36 L15 48 L25 45Z M40 36 L49 48 L39 45Z" fill="#0d1b2a"/>' +
        '<path d="M32 5 C42 14 45 30 40 46 H24 C19 30 22 14 32 5Z" fill="#0d1b2a"/>' +
        '<circle cx="32" cy="24" r="5" fill="#8fd0f5" fill-opacity=".3" stroke="#8fd0f5"/>' +
        '<path d="M26.5 13.5 H37.5" stroke-width="1.6" opacity=".7"/>' +
      '</svg>',
    saucer:
      '<svg viewBox="0 0 64 64" fill="none" stroke="#3796d0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M44 40 L50 50 M20 40 L14 50" stroke-width="1.8" opacity=".6"/>' +
        '<path d="M22 31 a10 10 0 0 1 20 0" fill="#8fd0f5" fill-opacity=".3" stroke="#8fd0f5"/>' +
        '<ellipse cx="32" cy="35" rx="24" ry="7" fill="#0d1b2a"/>' +
        '<circle class="fx-light" cx="20" cy="36" r="1.8" fill="#8fd0f5" stroke="none"/>' +
        '<circle class="fx-light" cx="32" cy="38.5" r="1.8" fill="#8fd0f5" stroke="none"/>' +
        '<circle class="fx-light" cx="44" cy="36" r="1.8" fill="#8fd0f5" stroke="none"/>' +
      '</svg>'
  };

  var small = window.innerWidth < 640;
  var crew = (small ? ['astronaut', 'rocket', 'saucer'] : ['astronaut', 'rocket', 'astronaut', 'saucer', 'rocket']).map(function (kind) {
    var el = document.createElement('div');
    el.className = 'fx-crew fx-' + kind;
    el.innerHTML = CREW_ART[kind];
    ambient.insertBefore(el, ambient.querySelector('.fx-cursor'));
    var size = (kind === 'astronaut' ? 36 : 32) * (small ? 0.8 : 1) * (0.85 + Math.random() * 0.4);
    el.style.width = el.style.height = size.toFixed(0) + 'px';
    var speed = kind === 'rocket' ? 34 + Math.random() * 14 : kind === 'saucer' ? 20 : 8 + Math.random() * 6;
    var angle = kind === 'saucer' ? (Math.random() < 0.5 ? 0 : Math.PI) : Math.random() * 6.283;
    return {
      el: el, kind: kind, size: size,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * 360,
      spin: kind === 'astronaut' ? (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 8) : 0,
      phase: Math.random() * 6.283
    };
  });

  function moveCrew(dt, t) {
    crew.forEach(function (c) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.spin * dt;
      var m = c.size * 2;
      if (c.x < -m) c.x = W + m; else if (c.x > W + m) c.x = -m;
      if (c.y < -m) c.y = H + m; else if (c.y > H + m) c.y = -m;
      var rot = c.kind === 'rocket' ? Math.atan2(c.vy, c.vx) * 57.296 + 90
              : c.kind === 'saucer' ? Math.sin(t * 0.0015 + c.phase) * 8
              : c.rot;
      var bob = c.kind === 'rocket' ? 0 : Math.sin(t * 0.001 + c.phase) * 6;
      c.el.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + (c.y + bob).toFixed(1) + 'px,0) rotate(' + rot.toFixed(1) + 'deg)';
    });
  }

  seedSky();
  window.addEventListener('resize', function () { seedSky(); if (reduce) drawSky(0); });
  if (reduce) {
    drawSky(0);
    moveCrew(0, 0);
  } else {
    var last = 0;
    var frame = function (t) {
      requestAnimationFrame(frame);
      if (t - last < 33) return;   // ~30 fps keeps the glass blur cheap
      var dt = Math.min((t - last) / 1000, 0.1);
      last = t;
      stepMeteor(dt);
      drawSky(t);
      moveCrew(dt, t);
    };
    requestAnimationFrame(frame);
  }

  if (finePointer && !reduce) {
    var cursor = ambient.querySelector('.fx-cursor');
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!cursor.style.opacity) { cx = tx; cy = ty; cursor.style.opacity = '1'; }
      if (!running) { running = true; requestAnimationFrame(follow); }
    }, { passive: true });
    function follow() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      cursor.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5) requestAnimationFrame(follow);
      else running = false;
    }
  }

  // ── Scroll progress ──────────────────────────────────────────
  var bar = document.createElement('div');
  bar.className = 'fx-progress';
  document.body.appendChild(bar);
  function progress() {
    var max = doc.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  }
  window.addEventListener('scroll', progress, { passive: true });
  window.addEventListener('resize', progress);
  progress();

  // ── Mark the current page in the table of contents ───────────
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.toc-item').forEach(function (a) {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });

  // ── Split titles into letters ────────────────────────────────
  document.querySelectorAll('.title, .page-title').forEach(function (h) {
    var n = 0;
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    Array.prototype.slice.call(h.childNodes).forEach(function (node) {
      if (node.nodeType === 1) {
        node.classList.add('fx-char');
        if (node.classList.contains('underscore')) node.classList.add('fx-caret');
        node.style.setProperty('--i', n++);
        node.setAttribute('aria-hidden', 'true');
        return;
      }
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var word = document.createElement('span');
        word.className = 'fx-word';
        word.setAttribute('aria-hidden', 'true');
        Array.from(part).forEach(function (ch) {
          var c = document.createElement('span');
          c.className = ch === '_' ? 'fx-char fx-caret' : 'fx-char';
          c.textContent = ch;
          c.style.setProperty('--i', n++);
          word.appendChild(c);
        });
        frag.appendChild(word);
      });
      h.replaceChild(frag, node);
    });
  });

  // ── Glass: specular highlight follows the pointer ────────────
  document.querySelectorAll('.glass').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });

  // ── Images: tilt toward the pointer ──────────────────────────
  if (finePointer && !reduce) {
    document.querySelectorAll('.project-img, .screenshot-wrap, .gallery-img, .photo-wrap').forEach(function (el) {
      el.classList.add('fx-tilt');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
        el.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  // ── Scroll reveal ────────────────────────────────────────────
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      '.page > :not(.top-group):not(nav):not(.fx-ambient), .toc li, .divider, .entry-divider, .description > p, .entry-desc > p'
    );
    targets.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--d', Math.min(batch++ * 0.07, 0.5) + 's');
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    // Commit the hidden state, then reveal what is already on screen
    // right away and leave the rest to the observer.
    void document.body.offsetHeight;
    var shown = 0;
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.style.setProperty('--d', Math.min(shown++ * 0.06, 0.6) + 's');
        el.classList.add('in');
      } else {
        io.observe(el);
      }
    });
  }

  // ── Page transitions between internal pages ──────────────────
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || e.defaultPrevented || a.target || a.hasAttribute('download')) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = a.getAttribute('href');
    if (!href || !/^[\w-]+\.html(#.*)?$/.test(href)) return;
    e.preventDefault();
    doc.classList.add('fx-leave');
    setTimeout(function () { location.href = href; }, reduce ? 0 : 260);
  });
  window.addEventListener('pageshow', function () { doc.classList.remove('fx-leave'); });
}());
