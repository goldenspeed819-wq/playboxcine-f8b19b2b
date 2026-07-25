// Rynex Scraper - background service worker
const found = {}; // tabId -> { embeds:Set-like array, streams:[] }
const opener = {}; // abas abertas pelo botão EMBED -> aba original
const autoClose = {}; // abas que devemos fechar após capturar

function bucket(tabId) {
  if (!found[tabId]) found[tabId] = { embeds: [], streams: [] };
  return found[tabId];
}

const EMBED_RE = /(server\.php\?[^"'\s<>]+|RCServer[^"'\s<>]*|\/player\d*\/[^"'\s<>]+)/i;
const BLOCKED_EMBED_RE = /disqus\.com|\/embed\/comments|comments\/?\?/i;
const ASSET_RE = /\.(?:js|mjs|css|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|map|json|xml|txt|vtt|srt)(?:$|[?#])/i;

function push(list, url) {
  if (!url) return;
  if (BLOCKED_EMBED_RE.test(url)) return;
  if (ASSET_RE.test(url)) return;
  if (!list.includes(url)) list.push(url);
}

const owner = (tabId) => opener[tabId] || tabId;

// Sniff network for embeds / streams
chrome.webRequest.onBeforeRequest.addListener(
  (d) => {
    if (d.tabId < 0) return;
    const b = bucket(owner(d.tabId));
    if (EMBED_RE.test(d.url)) push(b.embeds, d.url);
    else if (/\.m3u8(\?|$)|\.mp4(\?|$)/i.test(d.url) && !/\.ts(\?|$)/i.test(d.url)) push(b.streams, d.url);
  },
  { urls: ["<all_urls>"] }
);

// O botão EMBED abre uma nova aba onde a URL final é gerada em tempo real
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.openerTabId != null) {
    opener[tab.id] = owner(tab.openerTabId);
    autoClose[tab.id] = Date.now();
  }
});

chrome.tabs.onRemoved.addListener((id) => {
  delete found[id];
  delete opener[id];
  delete autoClose[id];
});

chrome.tabs.onUpdated.addListener((id, info, tab) => {
  const url = info.url || tab?.url || "";
  if (opener[id]) {
    if (url && EMBED_RE.test(url)) push(bucket(opener[id]).embeds, url);
    // fecha a aba auxiliar depois de capturar
    if (autoClose[id] && url && /server\.php\?|RCServer/i.test(url)) {
      delete autoClose[id];
      setTimeout(() => chrome.tabs.remove(id).catch(() => {}), 400);
    }
    return;
  }
  if (info.status === "loading" && info.url) delete found[id];
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = msg.tabId ?? sender.tab?.id;
  if (msg.type === "FOUND") {
    const b = bucket(tabId);
    (msg.embeds || []).forEach((u) => push(b.embeds, u));
    (msg.streams || []).forEach((u) => push(b.streams, u));
    sendResponse({ ok: true });
    return true;
  }
  if (msg.type === "GET") {
    sendResponse(bucket(tabId));
    return true;
  }
  if (msg.type === "CLEAR_TAB") {
    delete found[tabId];
    sendResponse({ ok: true });
    return true;
  }
  return false;
});