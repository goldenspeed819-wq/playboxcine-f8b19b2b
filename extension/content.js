// Rynex Scraper - content script (runs in every frame)
(function () {
  if (window.__rynexScraper) return;
  window.__rynexScraper = true;

  const EMBED_RE =
    /https?:\/\/[^"'\s<>\\]*(?:server\.php\?[^"'\s<>\\]*|RCServer[^"'\s<>\\]*|\/player\d*\/[^"'\s<>\\]+)/gi;
  // Também aceita caminhos relativos (/player3/xxx.php?...) que aparecem no HTML bruto
  const REL_EMBED_RE = /["'\s(]((?:\/[\w.-]*)*\/(?:player\d*\/[^"'\s<>\\)]*|[^"'\s<>\\)]*server\.php\?[^"'\s<>\\)]*))/gi;
  const STREAM_RE = /https?:\/\/[^"'\s<>\\]+\.(?:m3u8|mp4)(?:\?[^"'\s<>\\]*)?/gi;
  const BLOCKED_EMBED_RE = /disqus\.com|\/embed\/comments|comments\/?\?/i;
  // Assets (js/css/imagens/fontes) nunca são embed
  const ASSET_RE = /\.(?:js|mjs|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|map|json|xml|txt|vtt|srt|ts)(?:$|[?#])/i;

  const uniq = (a) => [...new Set(a.filter(Boolean))];
  // O botão EMBED é um link: /player3/redirect.api?r=/player3/embed.api?embed=<base64 do server.php...>
  const EMBED_API_RE = /embed\.api\?embed=([A-Za-z0-9+/=_-]+)/gi;
  function decodeEmbedApi(b64) {
    try {
      const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
      if (!/server\.php|player\d/i.test(s)) return "";
      return new URL(s.replace(/^\/+/, ""), location.origin + "/").href;
    } catch (e) {
      return "";
    }
  }
  function collectEmbedApi(html, out) {
    EMBED_API_RE.lastIndex = 0;
    let m;
    while ((m = EMBED_API_RE.exec(html))) {
      const u = decodeEmbedApi(m[1]);
      if (u) out.push(u);
    }
    EMBED_API_RE.lastIndex = 0;
  }
  const isBlockedEmbed = (url) => !url || BLOCKED_EMBED_RE.test(url) || ASSET_RE.test(url);
  const isEmbedUrl = (url) => {
    if (!url || isBlockedEmbed(url)) return false;
    return /server\.php\?/i.test(url) || /RCServer/i.test(url) || /\/player\d*\//i.test(url);
  };

  function scanFrame() {
    const embeds = [];
    const streams = [];
    const html = document.documentElement ? document.documentElement.innerHTML : "";
    collectEmbedApi(html, embeds);
    document.querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href") || "";
      collectEmbedApi(h, embeds);
    });
    (html.match(EMBED_RE) || []).forEach((u) => {
      if (isEmbedUrl(u)) embeds.push(u);
    });
    (html.match(STREAM_RE) || []).forEach((u) => {
      if (!/\.ts(\?|$)/i.test(u)) streams.push(u);
    });
    document.querySelectorAll("iframe[src]").forEach((f) => {
      if (isEmbedUrl(f.src)) embeds.push(f.src);
      EMBED_RE.lastIndex = 0;
    });
    document.querySelectorAll("textarea, input[type=text]").forEach((el) => {
      const v = el.value || "";
      (v.match(EMBED_RE) || []).forEach((u) => {
        if (isEmbedUrl(u)) embeds.push(u);
      });
    });
    if (isEmbedUrl(location.href)) embeds.push(location.href);
    EMBED_RE.lastIndex = 0;
    REL_EMBED_RE.lastIndex = 0;
    let rm;
    while ((rm = REL_EMBED_RE.exec(html))) {
      let abs;
      try {
        abs = new URL(rm[1], location.href).href;
      } catch (e) {
        continue;
      }
      if (isEmbedUrl(abs)) embeds.push(abs);
    }
    REL_EMBED_RE.lastIndex = 0;
    return { embeds: uniq(embeds), streams: uniq(streams) };
  }

  // Entra nas páginas do player (mesmo domínio) e procura o embed dentro delas
  async function deepScan(depth) {
    const base = scanFrame();
    const out = { embeds: [...base.embeds], streams: [...base.streams] };
    if (depth <= 0) return out;

    const apiLinks = [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href") || "")
      .filter((h) => /redirect\.api\?|embed\.api\?embed=/i.test(h))
      .map((h) => {
        try {
          return new URL(h, location.href).href;
        } catch (e) {
          return "";
        }
      });

    // segue o link do botão EMBED (a URL final é gerada em tempo real no servidor)
    for (const link of uniq(apiLinks).slice(0, 3)) {
      try {
        const res = await fetch(link, { credentials: "include", redirect: "follow" });
        if (isEmbedUrl(res.url)) out.embeds.push(res.url);
        const h = await res.text();
        collectEmbedApi(h, out.embeds);
        (h.match(EMBED_RE) || []).forEach((u) => {
          if (isEmbedUrl(u)) out.embeds.push(u);
        });
        EMBED_RE.lastIndex = 0;
        let mm;
        REL_EMBED_RE.lastIndex = 0;
        while ((mm = REL_EMBED_RE.exec(h))) {
          try {
            const a2 = new URL(mm[1], res.url || link).href;
            if (isEmbedUrl(a2)) out.embeds.push(a2);
          } catch (e) {}
        }
        REL_EMBED_RE.lastIndex = 0;
      } catch (e) {}
    }

    const pages = uniq([
      ...[...document.querySelectorAll("iframe[src]")].map((f) => f.src),
      ...apiLinks,
      ...out.embeds,
    ]).filter((u) => {
      try {
        return new URL(u, location.href).origin === location.origin && u !== location.href;
      } catch (e) {
        return false;
      }
    });

    for (const p of pages.slice(0, 6)) {
      let html = "";
      try {
        const res = await fetch(p, { credentials: "include", headers: { Accept: "text/html,*/*" } });
        html = await res.text();
      } catch (e) {
        continue;
      }
      collectEmbedApi(html, out.embeds);
      (html.match(EMBED_RE) || []).forEach((u) => {
        if (isEmbedUrl(u)) out.embeds.push(u);
      });
      EMBED_RE.lastIndex = 0;
      REL_EMBED_RE.lastIndex = 0;
      let m;
      while ((m = REL_EMBED_RE.exec(html))) {
        try {
          const abs = new URL(m[1], p).href;
          if (isEmbedUrl(abs)) out.embeds.push(abs);
        } catch (e) {}
      }
      REL_EMBED_RE.lastIndex = 0;
      // iframes dentro dessa página (nível seguinte)
      const inner = [...html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map((x) => x[1]);
      for (const src of inner.slice(0, 3)) {
        let abs;
        try {
          abs = new URL(src, p).href;
        } catch (e) {
          continue;
        }
        if (isEmbedUrl(abs)) out.embeds.push(abs);
        if (depth > 1 && new URL(abs).origin === location.origin) {
          try {
            const r2 = await fetch(abs, { credentials: "include" });
            const h2 = await r2.text();
            collectEmbedApi(h2, out.embeds);
            (h2.match(EMBED_RE) || []).forEach((u) => {
              if (isEmbedUrl(u)) out.embeds.push(u);
            });
            EMBED_RE.lastIndex = 0;
            let m2;
            REL_EMBED_RE.lastIndex = 0;
            while ((m2 = REL_EMBED_RE.exec(h2))) {
              try {
                const a2 = new URL(m2[1], abs).href;
                if (isEmbedUrl(a2)) out.embeds.push(a2);
              } catch (e) {}
            }
            REL_EMBED_RE.lastIndex = 0;
          } catch (e) {}
        }
      }
    }
    out.embeds = uniq(out.embeds);
    out.streams = uniq(out.streams);
    return out;
  }

  function candidateText(el) {
    return (
      (el.textContent || "") +
      " " +
      ((el.className || "") && (el.className.baseVal !== undefined ? el.className.baseVal : el.className)) +
      " " +
      (el.id || "") +
      " " +
      ((el.getAttribute &&
        ["aria-label", "alt", "title", "data-title", "data-tooltip", "onclick"]
          .map((a) => el.getAttribute(a) || "")
          .join(" ")) ||
        "")
    ).toLowerCase();
  }

  function fire(el) {
    ["pointerdown", "mousedown", "mouseup", "click"].forEach((t) => {
      try {
        el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
      } catch (e) {}
    });
  }

  function clickEmbed() {
    // 1) o botão EMBED do player é um link redirect.api / embed.api
    const link = [...document.querySelectorAll("a[href]")].find((a) =>
      /redirect\.api\?|embed\.api\?embed=/i.test(a.getAttribute("href") || "")
    );
    if (link) {
      fire(link);
      try {
        link.click();
      } catch (e) {}
      return true;
    }
    const els = [
      ...document.querySelectorAll(
        'a,button,div,span,li,td,img,[role="button"],[onclick],[class*="embed" i],[id*="embed" i],[aria-label*="embed" i],[title*="embed" i]'
      ),
    ];
    const target = els.find((el) => {
      const txt = candidateText(el).trim();
      return (
        (txt === "embed" || /^embed\b/.test(txt) || txt.includes(" embed") || txt.includes("embed ")) &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0 &&
        el.offsetWidth < 500 &&
        el.offsetHeight < 220
      );
    });
    if (target) {
      fire(target);
      return true;
    }
    return false;
  }

  function meta() {
    const g = (s) => document.querySelector(s)?.content || "";
    const title =
      g('meta[property="og:title"]') ||
      document.querySelector("h1")?.textContent?.trim() ||
      document.title ||
      "";
    return {
      url: location.href,
      title: title.replace(/\s+/g, " ").trim(),
      thumb: g('meta[property="og:image"]'),
      description: g('meta[property="og:description"]') || g('meta[name="description"]'),
    };
  }

  function report() {
    const r = scanFrame();
    if (r.embeds.length || r.streams.length) {
      try {
        chrome.runtime.sendMessage({ type: "FOUND", ...r });
      } catch (e) {}
    }
  }

  chrome.runtime.onMessage.addListener((msg, s, sendResponse) => {
    if (msg.type === "SCAN") {
      clickEmbed();
      setTimeout(async () => {
        report();
        let deep = scanFrame();
        try {
          deep = await deepScan(2);
        } catch (e) {}
        try {
          chrome.runtime.sendMessage({ type: "FOUND", ...deep });
        } catch (e) {}
        sendResponse({ ...deep, meta: window.top === window ? meta() : null });
      }, 700);
      return true;
    }
    if (msg.type === "META") {
      sendResponse(meta());
      return true;
    }
    return false;
  });

  setTimeout(report, 1500);
  new MutationObserver(() => {
    clearTimeout(window.__rynexT);
    window.__rynexT = setTimeout(report, 800);
  }).observe(document.documentElement, { childList: true, subtree: true });
})();