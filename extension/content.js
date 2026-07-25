// Rynex Scraper - content script (runs in every frame)
(function () {
  if (window.__rynexScraper) return;
  window.__rynexScraper = true;

  const EMBED_RE =
    /https?:\/\/[^"'\s<>\\]*(?:server\.php\?[^"'\s<>\\]*|RCServer[^"'\s<>\\]*|\/embed\/[^"'\s<>\\]+|\/player\/[^"'\s<>\\]+)/gi;
  const STREAM_RE = /https?:\/\/[^"'\s<>\\]+\.(?:m3u8|mp4)(?:\?[^"'\s<>\\]*)?/gi;

  const uniq = (a) => [...new Set(a.filter(Boolean))];

  function scanFrame() {
    const embeds = [];
    const streams = [];
    const html = document.documentElement ? document.documentElement.innerHTML : "";
    (html.match(EMBED_RE) || []).forEach((u) => embeds.push(u));
    (html.match(STREAM_RE) || []).forEach((u) => {
      if (!/\.ts(\?|$)/i.test(u)) streams.push(u);
    });
    document.querySelectorAll("iframe[src]").forEach((f) => {
      if (EMBED_RE.test(f.src)) embeds.push(f.src);
      EMBED_RE.lastIndex = 0;
    });
    document.querySelectorAll("textarea, input[type=text]").forEach((el) => {
      const v = el.value || "";
      (v.match(EMBED_RE) || []).forEach((u) => embeds.push(u));
    });
    if (EMBED_RE.test(location.href)) embeds.push(location.href);
    EMBED_RE.lastIndex = 0;
    return { embeds: uniq(embeds), streams: uniq(streams) };
  }

  function fire(el) {
    ["pointerdown", "mousedown", "mouseup", "click"].forEach((t) => {
      try {
        el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
      } catch (e) {}
    });
  }

  function clickEmbed() {
    const els = [...document.querySelectorAll("a,button,div,span,li,td")];
    const target = els.find((el) => {
      const txt = (el.textContent || "").trim().toLowerCase();
      const id = ((el.id || "") + " " + (el.className || "")).toString().toLowerCase();
      return (
        (txt === "embed" || /^embed\b/.test(txt) || id.includes("embed")) &&
        el.offsetWidth > 0 &&
        el.offsetWidth < 400
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
      setTimeout(() => {
        report();
        sendResponse({ ...scanFrame(), meta: window.top === window ? meta() : null });
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