// Rynex Scraper - background service worker
const found = {}; // tabId -> { embeds:Set-like array, streams:[] }

function bucket(tabId) {
  if (!found[tabId]) found[tabId] = { embeds: [], streams: [] };
  return found[tabId];
}

const EMBED_RE = /(server\.php\?[^"'\s<>]+|RCServer[^"'\s<>]*|\/player\d*\/[^"'\s<>]+)/i;
const BLOCKED_EMBED_RE = /disqus\.com|\/embed\/comments|comments\/?\?/i;

function push(list, url) {
  if (!url) return;
  if (BLOCKED_EMBED_RE.test(url)) return;
  if (!list.includes(url)) list.push(url);
}

// Sniff network for embeds / streams
chrome.webRequest.onBeforeRequest.addListener(
  (d) => {
    if (d.tabId < 0) return;
    const b = bucket(d.tabId);
    if (EMBED_RE.test(d.url)) push(b.embeds, d.url);
    else if (/\.m3u8(\?|$)|\.mp4(\?|$)/i.test(d.url) && !/\.ts(\?|$)/i.test(d.url)) push(b.streams, d.url);
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onRemoved.addListener((id) => delete found[id]);
chrome.tabs.onUpdated.addListener((id, info) => {
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