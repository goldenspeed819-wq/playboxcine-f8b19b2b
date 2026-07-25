const $ = (s) => document.querySelector(s);
const DEFAULT_SITE = "https://playboxcine.lovable.app";
let tabId = null;
let meta = {};
let pollTimer = null;

function isEmbed(u) {
  return /server\.php\?|RCServer|\/player\d*\//i.test(u) &&
    !/disqus\.com|\/embed\/comments|redirect\.api|embed\.api/i.test(u);
}
function pickBest(found) {
  const embeds = (found.embeds || []).filter(isEmbed);
  return embeds.find((u) => /server\.php\?/i.test(u)) || embeds.find((u) => /RCServer/i.test(u)) || embeds[0] || "";
}
function serverOf(u) {
  const m = u.match(/[?&]server=([^&]+)/i) || u.match(/(RCServer\d*)/i);
  return m ? decodeURIComponent(m[1]) : "";
}
function slugOf(u) {
  try {
    const url = new URL(u);
    const id = url.searchParams.get("id") || url.searchParams.get("v") || url.searchParams.get("filme");
    if (id) return id;
    const last = url.pathname.split("/").filter(Boolean).pop() || "";
    return last.replace(/\.(php|html?)$/i, "");
  } catch (e) {
    return "";
  }
}
function info(u) {
  if (!u) return "";
  const s = serverOf(u), a = slugOf(u);
  return [s && `Servidor: ${s}`, a && `Abrev.: ${a}`].filter(Boolean).join(" • ");
}

const getQueue = async () => (await chrome.storage.local.get("queue")).queue || [];
async function setQueue(q) {
  await chrome.storage.local.set({ queue: q });
  render(q);
}
function render(q) {
  $("#count").textContent = `— ${q.length} na fila`;
  $("#list").innerHTML = q
    .map(
      (i, idx) =>
        `<div class="item"><div class="t">${i.type === "series" ? "📺" : "🎬"} ${i.title}</div><div class="u">${i.videos[0]?.url || ""}</div><div class="u">${info(i.videos[0]?.url || "")}</div><button class="ghost" data-i="${idx}" style="margin-top:6px;padding:4px 8px;font-size:11px">Remover</button></div>`
    )
    .join("");
  document.querySelectorAll("#list button").forEach((b) =>
    b.addEventListener("click", async () => {
      const q2 = await getQueue();
      q2.splice(Number(b.dataset.i), 1);
      setQueue(q2);
    })
  );
}

function applyFound(found) {
  if (!found) return false;
  if (found.meta) {
    meta = found.meta;
    if (!$("#title").value) $("#title").value = meta.title || "";
  }
  const best = pickBest(found);
  if (best) {
    $("#url").value = best;
    $("#info").textContent = info(best);
    return true;
  }
  return false;
}

async function readState() {
  const live = await chrome.runtime.sendMessage({ type: "GET", tabId }).catch(() => null);
  if (live && (live.embeds?.length || live.meta)) return live;
  const { last } = await chrome.storage.local.get("last");
  return last && last.tabId === tabId ? last : live;
}

async function scan() {
  $("#found").textContent = "Clicando no EMBED... (pode abrir uma aba, ela fecha sozinha)";
  chrome.runtime.sendMessage({ type: "CAPTURE", tabId }).catch(() => {});
  clearInterval(pollTimer);
  let tries = 0;
  pollTimer = setInterval(async () => {
    tries += 1;
    const st = await readState();
    if (applyFound(st)) {
      clearInterval(pollTimer);
      $("#found").textContent = "Embed capturado!";
    } else if (tries > 30) {
      clearInterval(pollTimer);
      $("#found").textContent = "Nada encontrado — clique no EMBED manualmente e reabra a extensão.";
    }
  }, 700);
}

async function add() {
  const url = $("#url").value.trim();
  const title = $("#title").value.trim();
  if (!url || !title) {
    $("#found").textContent = "Preencha título e link.";
    return;
  }
  const q = await getQueue();
  if (q.some((i) => i.videos[0]?.url === url)) {
    $("#found").textContent = "Já está na fila.";
    return;
  }
  q.push({
    url: meta.url || "",
    title,
    type: $("#tipo").value,
    thumb: meta.thumb || "",
    description: meta.description || "",
    server: serverOf(url),
    slug: slugOf(url),
    videos: [{ url, type: "EMBED" }],
  });
  await setQueue(q);
  $("#url").value = "";
  $("#title").value = "";
  $("#info").textContent = "";
  $("#found").textContent = "Adicionado!";
}

function payload(q) {
  return { results: q, total_itens: q.length, data_extracao: new Date().toLocaleString("pt-BR") };
}

$("#scan").addEventListener("click", scan);
$("#add").addEventListener("click", add);
$("#clear").addEventListener("click", () => setQueue([]));
$("#url").addEventListener("input", () => ($("#info").textContent = info($("#url").value.trim())));
$("#copy").addEventListener("click", async () => {
  const q = await getQueue();
  await navigator.clipboard.writeText(JSON.stringify(payload(q), null, 2));
  $("#found").textContent = "JSON copiado!";
});
$("#send").addEventListener("click", async () => {
  const q = await getQueue();
  if (!q.length) {
    $("#found").textContent = "Fila vazia.";
    return;
  }
  const { site } = await chrome.storage.local.get("site");
  const base = (site || DEFAULT_SITE).replace(/\/+$/, "");
  const url = `${base}/admin/external-import#json=${encodeURIComponent(JSON.stringify(payload(q)))}`;
  chrome.tabs.create({ url });
});
$("#site").addEventListener("change", () => chrome.storage.local.set({ site: $("#site").value.trim() }));

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  const { site } = await chrome.storage.local.get("site");
  $("#site").value = site || DEFAULT_SITE;
  render(await getQueue());
  const st = await readState();
  $("#found").textContent = applyFound(st) ? "Embed já capturado — confira o título." : "Clique em Procurar embed.";
})();
