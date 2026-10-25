(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var motion = matchMedia('(prefers-reduced-motion: reduce)');
  var cursor = doc.getElementById('cursor'), pending = 0, x = 0, y = 0;
  if (!cursor) {
    cursor = doc.createElement('div'); cursor.id = 'cursor'; cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true'); doc.body.appendChild(cursor);
  }
  cursor.replaceChildren();
  var ring = doc.createElement('span'); ring.className = 'cursor__ring'; cursor.appendChild(ring);
  function hide() { root.classList.remove('cursor-live'); cursor.classList.remove('is-down'); }
  function sync() { root.classList.toggle('has-cursor', fine.matches && !motion.matches); hide(); }
  doc.addEventListener('pointermove', function (e) {
    if (!fine.matches || motion.matches || e.pointerType === 'touch') return;
    x = e.clientX; y = e.clientY;
    var target = e.target;
    var text = target.closest('input,textarea,[contenteditable="true"]');
    var disabled = target.closest(':disabled,[aria-disabled="true"]');
    if (text || disabled) { hide(); return; }
    root.classList.add('cursor-live');
    cursor.classList.toggle('is-link', !!target.closest('a[href],button,summary,[role="button"]'));
    if (!pending) pending = requestAnimationFrame(function () {
      ring.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; pending = 0;
    });
  }, { passive: true });
  doc.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
  doc.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
  doc.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  doc.addEventListener('visibilitychange', function () { if (doc.hidden) hide(); });
  fine.addEventListener('change', sync); motion.addEventListener('change', sync); sync();
})();
