/* Rynex Scraper — cole no console do site de origem (ou use como bookmarklet).
   Captura automaticamente streams .m3u8 / .mp4 carregados pela página,
   junta título / capa / sinopse e acumula os itens entre páginas. */
(function () {
  if (window.__RYNEX_SCRAPER__) { window.__RYNEX_SCRAPER__.open(); return; }

  var STORE = 'rynex_scraper_items';
  var found = [];

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (e) { return []; }
  }
  function save(items) {
    try { localStorage.setItem(STORE, JSON.stringify(items)); } catch (e) {}
  }
  function isStream(u) {
    if (!u || typeof u !== 'string') return false;
    if (u.indexOf('blob:') === 0) return false;
    if (u.indexOf('/seg-') !== -1) return false;
    if (isEmbed(u)) return true;
    return /\.m3u8(\?|$)/i.test(u) || /\.mp4(\?|$)/i.test(u) || /\.mpd(\?|$)/i.test(u);
  }
  function isEmbed(u) {
    return /server\.php\?/i.test(u) || /RCServer/i.test(u) || /\/player\d*\//i.test(u);
  }
  function typeOf(u) {
    if (isEmbed(u)) return 'EMBED';
    if (/\.m3u8/i.test(u)) return 'HLS';
    if (/\.mpd/i.test(u)) return 'DASH';
    return 'MP4';
  }
  function add(u) {
    try { u = new URL(u, location.href).href; } catch (e) { return; }
    if (!isStream(u)) return;
    if (found.some(function (v) { return v.url === u; })) return;
    found.push({ url: u, type: typeOf(u) });
    render();
  }

  // --- hooks de rede ---
  var _fetch = window.fetch;
  window.fetch = function (input, init) {
    try { add(typeof input === 'string' ? input : (input && input.url)); } catch (e) {}
    return _fetch.apply(this, arguments);
  };
  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) { try { add(u); } catch (e) {} return _open.apply(this, arguments); };

  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { add(e.name); });
    }).observe({ entryTypes: ['resource'] });
    performance.getEntriesByType('resource').forEach(function (e) { add(e.name); });
  } catch (e) {}

  setInterval(function () {
    document.querySelectorAll('video, source').forEach(function (el) { add(el.src || el.getAttribute('src')); });
    document.querySelectorAll('iframe').forEach(function (el) { add(el.src || el.getAttribute('src')); });
    document.querySelectorAll('textarea, input').forEach(function (el) {
      var v = el.value || '';
      var mm = v.match(/(?:https?:)?\/\/[^"'\s]+server\.php\?[^"'\s]*/i);
      if (mm) add(mm[0].indexOf('//') === 0 ? location.protocol + mm[0] : mm[0]);
    });
    var html = document.documentElement.innerHTML;
    var re = /https?:\/\/[^"'\s\\]+\.(?:m3u8|mp4|mpd)[^"'\s\\]*/gi, m;
    while ((m = re.exec(html))) add(m[0]);
    var re2 = /(?:https?:)?\/\/[^"'\s\\<>]+server\.php\?[^"'\s\\<>]*/gi, m2;
    while ((m2 = re2.exec(html))) add(m2[0].indexOf('//') === 0 ? location.protocol + m2[0] : m2[0]);
  }, 1500);

  function meta(sel, attr) {
    var el = document.querySelector(sel);
    return el ? (el.getAttribute(attr || 'content') || '').trim() : '';
  }
  function pageTitle() {
    return meta('meta[property="og:title"]') ||
      (document.querySelector('h1') && document.querySelector('h1').textContent.trim()) ||
      document.title.trim();
  }
  function best() {
    var m = found.filter(function (v) { return v.type === 'HLS' && v.url.indexOf('master.m3u8') !== -1; })[0];
    return m || found.filter(function (v) { return v.type === 'HLS'; })[0] || found[0] || null;
  }

  // --- UI ---
  var box = document.createElement('div');
  box.setAttribute('style', 'position:fixed;z-index:2147483647;right:16px;bottom:16px;width:330px;background:#111;color:#fff;font:12px/1.4 system-ui,sans-serif;border:1px solid #e11d2f;border-radius:12px;padding:12px;box-shadow:0 10px 40px rgba(0,0,0,.6)');
  document.documentElement.appendChild(box);

  function render() {
    var items = load();
    var b = best();
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
        '<b style="color:#e11d2f;letter-spacing:.5px">RYNEX SCRAPER</b>' +
        '<span style="opacity:.6;cursor:pointer" id="rx-hide">—</span>' +
      '</div>' +
      '<div style="opacity:.85;margin-bottom:6px">' + (found.length ? found.length + ' stream(s) detectado(s)' : 'Dê play no vídeo para detectar…') + '</div>' +
      '<div style="font-size:10px;word-break:break-all;opacity:.6;max-height:52px;overflow:auto;margin-bottom:8px">' + (b ? b.url : '') + '</div>' +
      '<div style="margin-bottom:8px;opacity:.9">Fila: <b>' + items.length + '</b> item(ns)</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button id="rx-add" style="flex:1;background:#e11d2f;color:#fff;border:0;border-radius:8px;padding:7px;cursor:pointer;font-weight:600">Adicionar</button>' +
        '<button id="rx-copy" style="flex:1;background:#222;color:#fff;border:1px solid #333;border-radius:8px;padding:7px;cursor:pointer">Copiar JSON</button>' +
        '<button id="rx-clear" style="background:#222;color:#888;border:1px solid #333;border-radius:8px;padding:7px;cursor:pointer">Limpar</button>' +
      '</div>';

    box.querySelector('#rx-hide').onclick = function () { box.style.display = 'none'; };
    box.querySelector('#rx-add').onclick = function () {
      if (!found.length) { alert('Nenhum stream detectado ainda. Dê play no vídeo.'); return; }
      var items = load();
      var title = prompt('Título do conteúdo:', pageTitle());
      if (title === null) return;
      items = items.filter(function (i) { return i.url !== location.href; });
      items.push({
        url: location.href,
        title: title,
        thumb: meta('meta[property="og:image"]'),
        description: meta('meta[property="og:description"]') || meta('meta[name="description"]'),
        videos: found.slice()
      });
      save(items);
      render();
      alert('Adicionado! Total na fila: ' + items.length);
    };
    box.querySelector('#rx-copy').onclick = function () {
      var items = load();
      var json = JSON.stringify({ results: items, total_itens: items.length, data_extracao: new Date().toLocaleString() }, null, 2);
      navigator.clipboard.writeText(json).then(function () { alert('JSON copiado! Cole em Admin > JSON Externo.'); },
        function () { prompt('Copie o JSON:', json); });
    };
    box.querySelector('#rx-clear').onclick = function () {
      if (confirm('Limpar a fila?')) { save([]); render(); }
    };
  }

  window.__RYNEX_SCRAPER__ = { open: function () { box.style.display = 'block'; render(); } };
  render();
})();
