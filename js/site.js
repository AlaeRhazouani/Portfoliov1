/* Alae Rhazouani — backdrop, reveals, glass highlight, small interactions. */
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ── Deep-space backdrop ──────────────────────────────────────
  var space = document.createElement('div');
  space.className = 'space';
  space.setAttribute('aria-hidden', 'true');
  space.innerHTML = '<canvas></canvas><div class="aurora"></div><div class="planet"></div>';
  document.body.insertBefore(space, document.body.firstChild);

  var canvas = space.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, stars = [];
  var px = 0, py = 0, tx = 0, ty = 0;   // pointer parallax, eased

  function seed() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    var count = Math.round(W * H / 3200);
    for (var i = 0; i < count; i++) {
      var depth = Math.pow(Math.random(), 2.2);   // mostly distant
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.25 + depth * 1.05,
        depth: depth,
        a: 0.25 + depth * 0.6 + Math.random() * 0.15,
        speed: 0.4 + Math.random() * 1.2,
        phase: Math.random() * 6.283,
        warm: Math.random() < 0.08
      });
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var scroll = window.scrollY;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var shift = 2 + s.depth * 14;
      var x = s.x + px * shift;
      var y = ((s.y - scroll * (0.02 + s.depth * 0.08) + py * shift) % H + H) % H;
      var a = reduce ? s.a : s.a * (0.7 + 0.3 * Math.sin(t * 0.001 * s.speed + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = s.warm ? '#ffe9d2' : '#dcecff';
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  seed();
  window.addEventListener('resize', function () { seed(); draw(0); });
  if (finePointer && !reduce) {
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX / W - 0.5;
      ty = e.clientY / H - 0.5;
    }, { passive: true });
  }
  if (reduce) {
    draw(0);
  } else {
    var last = 0;
    var frame = function (t) {
      requestAnimationFrame(frame);
      if (t - last < 33) return;   // ~30 fps keeps the glass blur cheap
      last = t;
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
      draw(t);
    };
    requestAnimationFrame(frame);
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
