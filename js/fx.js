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
    document.querySelectorAll('.project-img, .screenshot-wrap, .gallery-img, .photo-wrap, .org-box').forEach(function (el) {
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
