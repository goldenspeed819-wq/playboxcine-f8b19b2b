// Rynex Scraper - background service worker
const found = {};      // tabId -> { embeds: [], streams: [] }
const opener = {};     // aba filha -> aba original
const closeAt = {};    // aba filha -> timestamp para fechar
const metaByTab = {};  // tabId -> meta

const EMBED_RE = /(server\.php\?[^"'\s<>]+|RCServer[^"'\s<>]*|\/player\d*\/[^"'\s<>]+)/i;
const BLOCKED_EMBED_RE = /disqus\.com|\/embed\/comments|comments\/?\?|redirect\.api|embed\.api/i;
const ASSET_RE = /\.(?:js|mjs|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|map|json|xml|txt|vtt|srt)(?:$|[?#])/i;
const DEBUGGER_VERSION = "1.3";
const debuggerTabs = new Set();

function bucket(tabId) {
  if (!found[tabId]) found[tabId] = { embeds: [], streams: [] };
  return found[tabId];
}
const owner = (tabId) => opener[tabId] || tabId;

function persist(tabId) {
  const b = bucket(tabId);
  chrome.storage.local.set({
    last: { tabId, embeds: b.embeds, streams: b.streams, meta: metaByTab[tabId] || null, at: Date.now() },
  });
}

function push(tabId, kind, url) {
  if (!url) return false;
  if (kind === "embeds" && (BLOCKED_EMBED_RE.test(url) || ASSET_RE.test(url) || !EMBED_RE.test(url))) return false;
  const list = bucket(tabId)[kind];
  if (list.includes(url)) return false;
  list.push(url);
  persist(tabId);
  return true;
}

chrome.webRequest.onBeforeRequest.addListener(
  (d) => {
    if (d.tabId < 0) return;
    const t = owner(d.tabId);
    if (EMBED_RE.test(d.url)) push(t, "embeds", d.url);
    else if (/\.m3u8(\?|$)|\.mp4(\?|$)/i.test(d.url) && !/\.ts(\?|$)/i.test(d.url)) push(t, "streams", d.url);
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.openerTabId != null) {
    opener[tab.id] = owner(tab.openerTabId);
    closeAt[tab.id] = Date.now() + 12000;
  }
});

chrome.tabs.onRemoved.addListener((id) => {
  delete found[id];
  delete opener[id];
  delete closeAt[id];
  delete metaByTab[id];
  debuggerTabs.delete(id);
});

chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId != null) debuggerTabs.delete(source.tabId);
});

async function ensureDebugger(tabId) {
  if (debuggerTabs.has(tabId)) return true;
  try {
    await chrome.debugger.attach({ tabId }, DEBUGGER_VERSION);
    debuggerTabs.add(tabId);
    return true;
  } catch (e) {
    return false;
  }
}

async function sendMouse(tabId, params) {
  const ok = await ensureDebugger(tabId);
  if (!ok) return false;
  try {
    await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", params);
    return true;
  } catch (e) {
    debuggerTabs.delete(tabId);
    return false;
  }
}

async function setPageVolume(tabId, msg) {
  const volume = Math.min(1, Math.max(0, Number(msg.value)));
  const muted = Boolean(msg.muted);
  if (!Number.isFinite(volume)) return false;
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      args: [volume, muted],
      func: (v, m) => {
        const apply = () => {
          document.querySelectorAll("video, audio").forEach((media) => {
            media.volume = v;
            media.muted = m;
          });
        };
        apply();
        window.__rynexSiteVolume = v;
        window.__rynexSiteMuted = m;
        if (!window.__rynexVolumeObserver) {
          window.__rynexVolumeObserver = new MutationObserver(() => {
            const volume = typeof window.__rynexSiteVolume === "number" ? window.__rynexSiteVolume : v;
            const muted = Boolean(window.__rynexSiteMuted);
            document.querySelectorAll("video, audio").forEach((media) => {
              media.volume = volume;
              media.muted = muted;
            });
          });
          window.__rynexVolumeObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
      },
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function clickLikelyPlay(tabId, msg) {
  const x = Number(msg.x);
  const y = Number(msg.y);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    await remoteInput(tabId, { input: "click", x, y });
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const textOf = (el) =>
          ((el.textContent || "") + " " + (el.id || "") + " " + (el.className || "") + " " +
            ["aria-label", "title", "alt", "data-title"].map((a) => el.getAttribute?.(a) || "").join(" ")).toLowerCase();
        const candidates = [...document.querySelectorAll('button,a,[role="button"],div,span,svg')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0 || r.width > 260 || r.height > 260) return false;
            const txt = textOf(el);
            return /\b(play|reproduzir|assistir|iniciar|start)\b|▶|►/i.test(txt);
          })
          .sort((a, b) => {
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            const ac = Math.abs(ar.left + ar.width / 2 - innerWidth / 2) + Math.abs(ar.top + ar.height / 2 - innerHeight / 2);
            const bc = Math.abs(br.left + br.width / 2 - innerWidth / 2) + Math.abs(br.top + br.height / 2 - innerHeight / 2);
            return ac - bc;
          });
        const target = candidates[0];
        if (!target) return false;
        ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((type) => {
          target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
        target.click?.();
        return true;
      },
    });
  } catch (e) {}
  if (Number.isFinite(x) && Number.isFinite(y)) {
    setTimeout(() => remoteInput(tabId, { input: "click", x, y }), 250);
    setTimeout(() => remoteInput(tabId, { input: "click", x, y }), 900);
  }
  return true;
}

async function remoteInput(tabId, msg) {
  if (!tabId || tabId < 0) return false;
  if (msg.input === "volume") return setPageVolume(tabId, msg);
  if (msg.input === "embedPlay") return clickLikelyPlay(tabId, msg);
  const x = Number(msg.x);
  const y = Number(msg.y);
  if ((msg.input === "move" || msg.input === "click" || msg.input === "doubleClick" || msg.input === "rightClick" || msg.input === "scroll") && (!Number.isFinite(x) || !Number.isFinite(y))) {
    return false;
  }

  if (msg.input === "move") {
    return sendMouse(tabId, { type: "mouseMoved", x, y, button: "none" });
  }
  if (msg.input === "scroll") {
    return sendMouse(tabId, {
      type: "mouseWheel",
      x,
      y,
      deltaX: 0,
      deltaY: Number(msg.dy) || 0,
    });
  }

  const button = msg.input === "rightClick" ? "right" : "left";
  const clicks = msg.input === "doubleClick" ? 2 : 1;
  await sendMouse(tabId, { type: "mouseMoved", x, y, button: "none" });
  for (let i = 1; i <= clicks; i += 1) {
    await sendMouse(tabId, { type: "mousePressed", x, y, button, buttons: button === "left" ? 1 : 2, clickCount: i });
    await sendMouse(tabId, { type: "mouseReleased", x, y, button, buttons: 0, clickCount: i });
  }
  return true;
}

// Extrai o embed dentro da aba aberta pelo botão EMBED (iframe / textarea / html)
async function harvest(tabId) {
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const out = [];
        const RE = /https?:\/\/[^"'\s<>\\]*(?:server\.php\?[^"'\s<>\\]*|\/player\d*\/[^"'\s<>\\]+)/gi;
        const html = document.documentElement ? document.documentElement.innerHTML : "";
        (html.match(RE) || []).forEach((u) => out.push(u));
        document.querySelectorAll("iframe[src]").forEach((f) => out.push(f.src));
        document.querySelectorAll("textarea, input").forEach((el) => {
          const v = el.value || "";
          (v.match(RE) || []).forEach((u) => out.push(u));
          if (/^https?:\/\//.test(v)) out.push(v);
        });
        out.push(location.href);
        return out;
      },
    });
    (res || []).forEach((r) => (r.result || []).forEach((u) => push(owner(tabId), "embeds", u)));
  } catch (e) {}
}

chrome.tabs.onUpdated.addListener(async (id, info, tab) => {
  const url = info.url || tab?.url || "";
  if (opener[id]) {
    if (url) push(opener[id], "embeds", url);
    if (info.status === "complete") {
      await harvest(id);
      const parent = opener[id];
      setTimeout(() => {
        chrome.tabs.remove(id).catch(() => {});
      }, 1200);
      persist(parent);
    }
    return;
  }
  if (info.status === "loading" && info.url) {
    delete found[id];
    delete metaByTab[id];
  }
});

// limpa abas auxiliares esquecidas
setInterval(() => {
  const now = Date.now();
  Object.keys(closeAt).forEach((id) => {
    if (closeAt[id] < now) {
      delete closeAt[id];
      chrome.tabs.remove(Number(id)).catch(() => {});
    }
  });
}, 5000);

async function grabMeta(tabId) {
  try {
    const [r] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const g = (s) => document.querySelector(s)?.content || "";
        return {
          url: location.href,
          title: (g('meta[property="og:title"]') || document.querySelector("h1")?.textContent || document.title || "")
            .replace(/\s+/g, " ")
            .trim(),
          thumb: g('meta[property="og:image"]'),
          description: g('meta[property="og:description"]') || g('meta[name="description"]'),
        };
      },
    });
    if (r?.result) metaByTab[tabId] = r.result;
  } catch (e) {}
}

async function clickEmbed(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const fire = (el) => {
          ["pointerover", "mouseover", "pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((t) => {
            try {
              el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
            } catch (e) {}
          });
          try { el.click(); } catch (e) {}
        };
        const link = [...document.querySelectorAll("a[href]")].find((a) =>
          /redirect\.api\?|embed\.api\?embed=/i.test(a.getAttribute("href") || "")
        );
        if (link) { fire(link); return 1; }
        const textOf = (el) =>
          ((el.textContent || "") + " " + (el.id || "") + " " +
            (["aria-label", "alt", "title", "onclick"].map((a) => (el.getAttribute && el.getAttribute(a)) || "").join(" "))
          ).toLowerCase();
        let n = 0;
        [...document.querySelectorAll('a,button,div,span,li,td,img,[role="button"],[onclick]')].forEach((el) => {
          const txt = textOf(el).trim();
          const r = el.getBoundingClientRect();
          if (!/\bembed\b/.test(txt)) return;
          if (r.width <= 0 || r.height <= 0 || r.width > 500 || r.height > 220) return;
          if (el.children && el.children.length > 5) return;
          fire(el);
          n += 1;
        });
        return n;
      },
    });
  } catch (e) {}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = msg.tabId ?? sender.tab?.id;
  if (msg.type === "FOUND") {
    const t = owner(tabId);
    (msg.embeds || []).forEach((u) => push(t, "embeds", u));
    (msg.streams || []).forEach((u) => push(t, "streams", u));
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "GET") {
    sendResponse({ ...bucket(tabId), meta: metaByTab[tabId] || null });
    return true;
  }
  if (msg.type === "CAPTURE") {
    (async () => {
      await grabMeta(tabId);
      await clickEmbed(tabId);
      persist(tabId);
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (msg.type === "CLEAR_TAB") {
    delete found[tabId];
    delete metaByTab[tabId];
    chrome.storage.local.remove("last");
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "REMOTE_INPUT") {
    (async () => {
      const ok = await remoteInput(tabId, msg);
      sendResponse({ ok });
    })();
    return true;
  }
  return false;
});
