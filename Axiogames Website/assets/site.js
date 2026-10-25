(function () {
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

   
  var destinations = [
    ['Home', '/home', 'Studio overview'], ['Games', '/games', 'Explore our worlds'],
    ['Community Hub', '/hub', 'Chat, friends and support'], ['Account', '/account', 'Discord and Roblox connections'],
    ['Team', '/team', 'Meet the studio'], ['Contact', '/contact', 'Get in touch'],
    ['Scam Logs', '/scam-logs', 'Confirmed community reports'], ['Jobs', '/others/jobs', 'Join the team'],
    ['Giveaways & Events', '/others/giveaways', 'Community events'], ['Subscriptions', '/subscriptions', 'Membership plans']
  ];
  var searchDialog = doc.createElement('dialog'); searchDialog.className = 'site-search';
  searchDialog.setAttribute('aria-label', 'Find your destination');
  var searchTitle = doc.createElement('h2'); searchTitle.textContent = 'Where to next?';
  var searchInput = doc.createElement('input'); searchInput.type = 'search'; searchInput.placeholder = 'Search pages and features...'; searchInput.setAttribute('aria-label', 'Search pages and features');
  var searchResults = doc.createElement('div'); searchResults.className = 'site-search__results';
  var searchClose = doc.createElement('button'); searchClose.type = 'button'; searchClose.className = 'site-search__close'; searchClose.textContent = 'Close';
  function drawSearch() {
    searchResults.replaceChildren();
    var matches = destinations.filter(function (d) { return (d[0] + ' ' + d[2]).toLowerCase().indexOf(searchInput.value.trim().toLowerCase()) !== -1; });
    matches.forEach(function (d) {
      var a = doc.createElement('a'), name = doc.createElement('span'), description = doc.createElement('small');
      a.href = d[1]; name.textContent = d[0]; description.textContent = d[2]; a.append(name, description); searchResults.appendChild(a);
    });
    if (!matches.length) { var empty = doc.createElement('p'); empty.textContent = 'No matches. Try another page or feature.'; searchResults.appendChild(empty); }
  }
  function openSearch() { if (searchDialog.open) return; searchInput.value = ''; drawSearch(); searchDialog.showModal(); searchInput.focus(); }
  searchInput.addEventListener('input', drawSearch);
  searchDialog.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); searchDialog.close(); return; }
    var links = $$('a', searchResults), i = links.indexOf(doc.activeElement);
    if (e.key === 'ArrowDown' && links.length) { e.preventDefault(); links[(i + 1) % links.length].focus(); }
    if (e.key === 'ArrowUp' && links.length) { e.preventDefault(); links[(i - 1 + links.length) % links.length].focus(); }
    if (e.key === 'Enter' && doc.activeElement === searchInput && links.length) { e.preventDefault(); links[0].click(); }
  });
  searchClose.addEventListener('click', function () { searchDialog.close(); });
  searchDialog.addEventListener('click', function (e) { if (e.target === searchDialog) { var r = searchDialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) searchDialog.close(); } });
  searchDialog.append(searchTitle, searchInput, searchResults, searchClose); doc.body.appendChild(searchDialog);
  var searchButton = doc.createElement('button'); searchButton.type = 'button'; searchButton.className = 'site-search-trigger'; searchButton.textContent = '\u2315'; searchButton.setAttribute('aria-label', 'Search site'); searchButton.title = 'Search site (Ctrl K)'; searchButton.addEventListener('click', openSearch);
  var headerSide = $('.header__side'); if (headerSide) headerSide.prepend(searchButton);
  doc.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !doc.body.classList.contains('is-locked')) { e.preventDefault(); openSearch(); } });

   
  var page = doc.body.getAttribute('data-page');
  var seen = false;
  try { seen = sessionStorage.getItem('axm-boot') === '1'; } catch (e) {}
  if (page === 'home' && !seen && !reduce) {
    var boot = doc.createElement('div');
    boot.className = 'boot';
    boot.setAttribute('aria-hidden', 'true');
    boot.innerHTML = '<div class="boot__bar"><i></i></div><p class="boot__text">ARISE</p>';
    doc.body.appendChild(boot);
    setTimeout(function () { boot.classList.add('is-done'); }, 1100);
    setTimeout(function () { boot.remove(); }, 1700);
    try { sessionStorage.setItem('axm-boot', '1'); } catch (e) {}
  }

   
  var rail = $('#headerRail'), toTop = $('#toTop');
  function onScroll() {
    var h = root.scrollHeight - window.innerHeight;
    if (rail) rail.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    if (toTop) toTop.classList.toggle('show', window.scrollY > 700);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

   
  var burger = $('#burger'), nav = $('#nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });
  }

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger && nav) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  });
   
  var items = $$('.reveal');
  items.forEach(function (el) { var d = el.getAttribute('data-delay'); if (d) el.style.transitionDelay = d + 'ms'; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add('in'); }); }

   
  var quotes = $$('.quote'), dotsWrap = $('#quoteDots');
  if (quotes.length && dotsWrap) {
    var qi = 0, timer;
    quotes.forEach(function (q, i) {
      var b = doc.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', 'Show quote ' + (i + 1));
      b.addEventListener('click', function () { show(i); start(); });
      dotsWrap.appendChild(b);
    });
    var dots = $$('button', dotsWrap);
    function show(i) {
      qi = i;
      quotes.forEach(function (q, k) { q.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
    }
    function start() { clearInterval(timer); if (!reduce) timer = setInterval(function () { show((qi + 1) % quotes.length); }, 5200); }
    show(0); start();
  }

   
  var modal = $('#modal');
  if (modal) {
    var body = $('#modalBody'), title = $('#modalTitle');
    var content = {
      privacy: ['Privacy', [
        'Fonts are loaded from Google Fonts, so your browser contacts Google to download them.',
        'Signing in uses Discord. We only receive your public Discord name, ID and avatar.',
        'To verify your Roblox account, sign in on Roblox and approve linking, or use the profile verification alternative. We store your Roblox username and ID.',
        'If you enter a giveaway or event in our Discord, we store your Discord ID and display name with your entry. Winners are shown by display name on the Giveaways & Events page for 7 days after it ends.',
        'Scam reports, applications, contact messages and marketplace posts are stored so staff can review them. Only staff see reports and messages. The public scam log shows confirmed Roblox usernames, IDs and a staff-written summary, never the reporter.',
        'We use one session cookie to keep you signed in and remember your light or dark choice in your browser. No analytics or advertising trackers are used.'
      ]]
    };
    var lastFocus = null;
    function closeModal() { modal.hidden = true; doc.body.classList.remove('is-locked'); if (lastFocus) lastFocus.focus(); }
    $$('[data-modal]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = content[b.getAttribute('data-modal')]; if (!c) return;
        lastFocus = b; title.textContent = c[0];
        body.innerHTML = ''; c[1].forEach(function (t) { var p = doc.createElement('p'); p.textContent = t; body.appendChild(p); });
        modal.hidden = false; doc.body.classList.add('is-locked'); $('.modal__close', modal).focus();
      });
    });
    $$('[data-close]', modal).forEach(function (el) { el.addEventListener('click', closeModal); });
    doc.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') {
        var focusable = $$('button,a[href],input,[tabindex="0"]', modal), first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

   
  var av = $('#avatar');
  if (av) {
    var rows = ['...FFFFFF...', '..FfffffffF.', '.FfFfffffFfF', '.FFFFFFFFFF.', '.kkkkkkkkkk.', '.kkEkkkkEkk.', '..kssssssk..', '...ssSSss...', '....cwwc....', '..kkkwwkkk..', '.kkkkwwkkkk.', '.kkkkkkkkkk.'];
    var pal = { F: '#3d332c', f: '#7a675a', k: '#14121a', s: '#e8b48a', S: '#b9835e', w: '#f2f2f2', c: '#c9ced8', E: '#d9c6ff' };
    var c2 = av.getContext('2d');
    rows.forEach(function (row, y) { for (var x = 0; x < 12; x++) { var ch = row[x]; if (ch !== '.') { c2.fillStyle = pal[ch]; c2.fillRect(x, y, 1, 1); } } });
  }

   
  var sub = $$('.subnav a[href^="#"]');
  if (sub.length && 'IntersectionObserver' in window) {
    var map = {};
    sub.forEach(function (a) { var t = doc.getElementById(a.getAttribute('href').slice(1)); if (t) map[t.id] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        sub.forEach(function (a) { a.removeAttribute('aria-current'); });
        map[en.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { spy.observe(doc.getElementById(id)); });
  }

  var yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
})();
