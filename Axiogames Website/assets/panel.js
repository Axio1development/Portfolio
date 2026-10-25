 
(function () {
  document.querySelectorAll('[data-table-search]').forEach(function (box) {
    var wrap = box.nextElementSibling, table = wrap && wrap.querySelector('table');
    if (!table) return;
    var rows = Array.prototype.slice.call(table.tBodies[0].rows), empty = document.createElement('p');
    empty.className = 'pnl__empty'; empty.textContent = 'Nothing matches that search.'; empty.hidden = true;
    wrap.parentNode.insertBefore(empty, wrap.nextSibling);
    box.addEventListener('input', function () {
      var q = box.value.trim().toLowerCase(), shown = 0;
      rows.forEach(function (r) { var hit = !q || r.textContent.toLowerCase().indexOf(q) > -1; r.hidden = !hit; if (hit) shown++; });
      empty.hidden = shown > 0; wrap.hidden = shown === 0;
    });
  });
})();
