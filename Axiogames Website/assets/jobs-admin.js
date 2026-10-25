 
(function () {
  var box = document.getElementById('jq'), data = document.getElementById('jq-data'), form = document.getElementById('job-form');
  if (!box || !data || !form) return;
  var list = [];
  try { list = JSON.parse(data.value) || []; } catch (e) {}
  if (!list.length) list = [{ q: 'Why do you want this role?', type: 'long', required: true }, { q: 'What experience do you have?', type: 'long', required: true }];

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'text') n.textContent = v; else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function sync() { data.value = JSON.stringify(list.filter(function (x) { return x.q.trim(); })); }
  function draw() {
    while (box.firstChild) box.removeChild(box.firstChild);
    list.forEach(function (x, i) {
      var q = el('input', { type: 'text', maxlength: 200, placeholder: 'Question ' + (i + 1), 'aria-label': 'Question ' + (i + 1) }); q.value = x.q;
      q.addEventListener('input', function () { x.q = q.value; sync(); });
      var t = el('select', { 'aria-label': 'Answer type' }, [el('option', { value: 'short', text: 'Short answer' }), el('option', { value: 'long', text: 'Long answer' })]); t.value = x.type;
      t.addEventListener('change', function () { x.type = t.value; sync(); });
      var r = el('input', { type: 'checkbox' }); r.checked = !!x.required;
      r.addEventListener('change', function () { x.required = r.checked; sync(); });
      box.appendChild(el('div', { class: 'jq__row' }, [
        el('span', { class: 'jq__n', text: String(i + 1) }), q, t,
        el('label', { class: 'pnl__check' }, [r, 'Required']),
        el('span', { class: 'jq__tools' }, [
          el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: '↑', title: 'Move up', disabled: i === 0, onclick: function () { list.splice(i - 1, 0, list.splice(i, 1)[0]); draw(); } }),
          el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: '↓', title: 'Move down', disabled: i === list.length - 1, onclick: function () { list.splice(i + 1, 0, list.splice(i, 1)[0]); draw(); } }),
          el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'Remove', onclick: function () { list.splice(i, 1); draw(); } })])
      ]));
    });
    box.appendChild(el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: '+ Add question', disabled: list.length >= 20, onclick: function () { list.push({ q: '', type: 'short', required: false }); draw(); box.querySelectorAll('input[type=text]')[list.length - 1].focus(); } }));
    sync();
  }
  form.addEventListener('submit', sync);
  draw();
})();
