/* Rynex Scraper — carregado pelo favorito do Admin > Scraper.
   Foco: capturar o link de EMBED (player3/server.php?server=RCServerXX&vid=...). */
(function () {
  if (window.__RYNEX_SCRAPER__) { window.__RYNEX_SCRAPER__.open(); return; }

  var STORE = 'rynex_scraper_items';
  var embeds = [];

  function load() { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (e) { return []; } }
  function save(i) { try { localStorage.setItem(STORE, JSON.stringify(i)); } catch (e) {} }

  function isEmbed(u) {
    if (!u || typeof u !== 'string') return false;
    if (/disqus\.com|\/embed\/comments|comments\/?\?/i.test(u)) return false;
    if (/\.(?:js|mjs|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|map|json|xml|txt|vtt|srt)(?:$|[?#])/i.test(u)) return false;
    return /server\.php\?/i.test(u) || /RCServer/i.test(u) || /\/player\d*\//i.test(u);
  }
  function abs(u) {
    if (!u) return null;
    if (u.indexOf('//') === 0) return location.protocol + u;
    try { return new URL(u, location.href).href; } catch (e) { return null; }
  }
  function add(u) {
    u = abs(u);
    if (!u || !isEmbed(u)) return;
    if (embeds.indexOf(u) !== -1) return;
    embeds.push(u);
    render();
  }

  function scanText(text) {
    if (!text) return;
    var re = /(?:https?:)?\/\/[^"'\s\\<>()]+?\/player\d*\/[^"'\s\\<>()]*/gi, m;
    while ((m = re.exec(text))) add(m[0]);
    var re2 = /(?:https?:)?\/\/[^"'\s\\<>()]+server\.php\?[^"'\s\\<>()]*/gi, m2;
    while ((m2 = re2.exec(text))) add(m2[0]);
    var re3 = /(?:src|SRC)\s*=\s*["']([^"']*(?:server\.php|player\d)[^"']*)["']/g, m3;
    while ((m3 = re3.exec(text))) add(m3[1]);
  }

  function docs(root, out, depth) {
    out = out || []; depth = depth || 0;
    if (!root || out.indexOf(root) !== -1 || depth > 4) return out;
    out.push(root);
    var frames = root.querySelectorAll('iframe,frame');
    for (var i = 0; i < frames.length; i++) {
      var d = null;
      try { d = frames[i].contentDocument; } catch (e) { d = null; }
      if (d) docs(d, out, depth + 1);
    }
    return out;
  }

  function fire(el) {
    var ev = ['pointerover', 'mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    for (var i = 0; i < ev.length; i++) {
      try {
        el.dispatchEvent(new MouseEvent(ev[i], { bubbles: true, cancelable: true, view: el.ownerDocument.defaultView }));
      } catch (e) {}
    }
    try { el.click(); } catch (e) {}
  }

  function clickEmbedButton() {
    var list = docs(document);
    var clicked = 0;
    for (var d = 0; d < list.length; d++) {
      var nodes;
      try { nodes = list[d].querySelectorAll('a,button,div,span,img,li,td,[onclick],[class*=embed],[id*=embed],[class*=Embed],[id*=Embed]'); } catch (e) { continue; }
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var txt = ((el.textContent || '') + ' ' + (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '') + ' ' +
          (el.id || '') + ' ' + (el.getAttribute && ['aria-label', 'alt', 'title', 'data-title', 'data-tooltip', 'onclick'].map(function (a) { return el.getAttribute(a) || ''; }).join(' ') || '')).toLowerCase().trim();
        var rect = el.getBoundingClientRect && el.getBoundingClientRect();
        if (!(txt === 'embed' || /^embed\b/.test(txt) || txt.indexOf(' embed') !== -1 || txt.indexOf('embed ') !== -1)) continue;
        if (rect && (rect.width <= 0 || rect.height <= 0 || rect.width > 500 || rect.height > 220)) continue;
        if (el.children && el.children.length > 5) continue;
        fire(el);
        clicked++;
      }
    }
    return clicked;
  }

  function scan() {
    var list = docs(document);
    for (var d = 0; d < list.length; d++) {
      var doc = list[d];
      try {
        doc.querySelectorAll('iframe,frame').forEach(function (f) { add(f.src || f.getAttribute('src')); });
        doc.querySelectorAll('textarea, input').forEach(function (el) { scanText(el.value || ''); });
        doc.querySelectorAll('a').forEach(function (a) { add(a.getAttribute('href')); });
        scanText(doc.documentElement.innerHTML);
      } catch (e) {}
    }
    if (!scan._raw) {
      scan._raw = true;
      try {
        fetch(location.href, { credentials: 'include' })
          .then(function (r) { return r.text(); })
          .then(function (t) { scanText(t); })
          .catch(function () {});
      } catch (e) {}
    }
  }

  setInterval(scan, 2000);

  function meta(sel) { var el = document.querySelector(sel); return el ? (el.getAttribute('content') || '').trim() : ''; }
  function pageTitle() {
    return meta('meta[property="og:title"]') ||
      (document.querySelector('h1') && document.querySelector('h1').textContent.trim()) ||
      document.title.trim();
  }

  var box = document.createElement('div');
  box.setAttribute('style', 'position:fixed;z-index:2147483647;right:16px;bottom:16px;width:340px;background:#111;color:#fff;font:12px/1.4 system-ui,sans-serif;border:1px solid #e11d2f;border-radius:12px;padding:12px;box-shadow:0 10px 40px rgba(0,0,0,.6)');
  document.documentElement.appendChild(box);

  var manual = '';
  function chosen() { return manual || embeds[0] || null; }

  function render() {
    var items = load();
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<b style="color:#e11d2f;letter-spacing:.5px">RYNEX SCRAPER</b>' +
        '<span style="opacity:.6;cursor:pointer" id="rx-hide">—</span>' +
      '</div>' +
      '<div style="opacity:.85;margin-bottom:6px">' + (embeds.length ? embeds.length + ' embed(s) encontrado(s)' : 'Nenhum embed ainda — clique em "Procurar embed"') + '</div>' +
      '<input id="rx-url" placeholder="Cole aqui o link do Embed (opcional)" value="' + (manual ? manual.replace(/"/g, '&quot;') : (embeds[0] || '')) + '" style="width:100%;box-sizing:border-box;background:#000;color:#0f0;border:1px solid #333;border-radius:6px;padding:6px;font:10px monospace;margin-bottom:8px" />' +
      '<div style="margin-bottom:8px;opacity:.9">Fila: <b>' + items.length + '</b> item(ns)</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button id="rx-scan" style="flex:1 1 100%;background:#222;color:#fff;border:1px solid #444;border-radius:8px;padding:7px;cursor:pointer">Procurar embed</button>' +
        '<button id="rx-add" style="flex:1;background:#e11d2f;color:#fff;border:0;border-radius:8px;padding:7px;cursor:pointer;font-weight:600">Adicionar</button>' +
        '<button id="rx-copy" style="flex:1;background:#222;color:#fff;border:1px solid #333;border-radius:8px;padding:7px;cursor:pointer">Copiar JSON</button>' +
        '<button id="rx-clear" style="background:#222;color:#888;border:1px solid #333;border-radius:8px;padding:7px;cursor:pointer">Limpar</button>' +
      '</div>';

    box.querySelector('#rx-url').oninput = function (e) { manual = e.target.value.trim(); };
    box.querySelector('#rx-hide').onclick = function () { box.style.display = 'none'; };
    box.querySelector('#rx-scan').onclick = function () {
      var n = clickEmbedButton();
      scan();
      setTimeout(scan, 600);
      setTimeout(function () {
        scan();
        if (!embeds.length) {
          alert('Não achei o embed automaticamente (' + n + ' botão(ões) clicado(s)).\nClique no botão EMBED do player e cole o link no campo do painel.');
        }
      }, 1600);
    };
    box.querySelector('#rx-add').onclick = function () {
      var url = (box.querySelector('#rx-url').value || '').trim() || chosen();
      if (!url) { alert('Nenhum embed encontrado. Clique no botão EMBED do player e cole o link aqui.'); return; }
      var items = load();
      var title = prompt('Título do conteúdo:', pageTitle());
      if (title === null) return;
      items = items.filter(function (i) { return i.url !== location.href; });
      items.push({
        url: location.href,
        title: title,
        thumb: meta('meta[property="og:image"]'),
        description: meta('meta[property="og:description"]') || meta('meta[name="description"]'),
        videos: [{ url: url, type: 'EMBED' }]
      });
      save(items);
      manual = '';
      render();
      alert('Adicionado! Total na fila: ' + items.length);
    };
    box.querySelector('#rx-copy').onclick = function () {
      var items = load();
      var json = JSON.stringify({ results: items, total_itens: items.length, data_extracao: new Date().toLocaleString() }, null, 2);
      navigator.clipboard.writeText(json).then(function () { alert('JSON copiado! Cole em Admin > JSON Externo.'); },
        function () { prompt('Copie o JSON:', json); });
    };
    box.querySelector('#rx-clear').onclick = function () { if (confirm('Limpar a fila?')) { save([]); render(); } };
  }

  window.__RYNEX_SCRAPER__ = { open: function () { box.style.display = 'block'; render(); } };
  scan();
  render();
})();