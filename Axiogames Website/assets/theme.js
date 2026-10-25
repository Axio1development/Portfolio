(function () {
  var d = document.documentElement, t = null;
  try { t = localStorage.getItem('axm-theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') t = 'dark';    
  d.setAttribute('data-theme', t);
  function apply(n) {
    d.setAttribute('data-theme', n);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', n === 'light' ? '#f6f6f3' : '#070810');
    var bs = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-label', n === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  }
  document.addEventListener('DOMContentLoaded', function () { apply(d.getAttribute('data-theme')); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!b) return;
    var n = d.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    apply(n);
    try { localStorage.setItem('axm-theme', n); } catch (x) {}
    window.dispatchEvent(new CustomEvent('axm-theme', { detail: n }));
  });
})();
