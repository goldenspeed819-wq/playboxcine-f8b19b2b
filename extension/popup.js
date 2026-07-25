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
  const capture = await chrome.runtime.sendMessage({ type: "CAPTURE", tabId }).catch((e) => ({ ok: false, error: e?.message || "Falha na extensão" }));
  if (capture && capture.ok === false) {
    $("#found").textContent = `Erro: ${capture.error || "não consegui iniciar a captura"}`;
    return;
  }
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
      $("#found").textContent = "Nada encontrado — clique no EMBED manualmente e deixe esta janela aberta por 5s.";
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

// ---- Controle (play / volume / tela cheia) ----
let volume = 100;
let muted = false;

function say(msg) {
  $("#status").textContent = msg;
}

async function sendInput(payload) {
  try {
    const res = await chrome.runtime.sendMessage({ type: "REMOTE_INPUT", tabId, ...payload });
    if (res && res.ok === false) say(`Erro: ${res.error || "comando recusado pelo Chrome"}`);
    return res;
  } catch (e) {
    say(`Erro: ${e?.message || "extensão sem resposta"}`);
    return { ok: false };
  }
}

async function applyVolume() {
  $("#volTxt").textContent = muted ? "mudo" : `${volume}%`;
  const res = await sendInput({ input: "volume", value: volume / 100, muted });
  if (res?.ok) say(muted ? "Áudio no mudo." : `Volume em ${volume}%.`);
}

async function goFullscreen() {
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const pick = [...document.querySelectorAll("video, iframe")]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter((i) => i.r.width > 200 && i.r.height > 120)
          .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0];
        const target = pick?.el || document.documentElement;
        try {
          if (document.fullscreenElement) { document.exitFullscreen(); return "exit"; }
          target.requestFullscreen?.();
          return "enter";
        } catch (e) {
          return "blocked";
        }
      },
    });
    const done = (res || []).map((r) => r.result).find((v) => v === "enter" || v === "exit");
    say(done ? "Tela cheia alternada." : "O Chrome bloqueou a tela cheia — clique uma vez na página.");
  } catch (e) {
    say(`Erro: ${e?.message || "não consegui a tela cheia"}`);
  }
}

$("#play").addEventListener("click", async () => {
  say("Controlando o vídeo desta aba...");
  const direct = await sendInput({ input: "media", action: "toggle" });
  if (direct?.ok) {
    say(direct.state?.paused ? "Vídeo pausado." : "Vídeo tocando.");
    return;
  }
  const res = await sendInput({ input: "embedPlay" });
  if (res?.ok) say(`Play enviado (${res.method || "ok"}).`);
});
$("#mute").addEventListener("click", () => {
  muted = !muted;
  $("#mute").textContent = muted ? "🔊 Som" : "🔇 Mudo";
  applyVolume();
});
$("#fs").addEventListener("click", async () => {
  const res = await sendInput({ input: "media", action: "fullscreen" });
  if (res?.ok) { say("Tela cheia do vídeo alternada."); return; }
  goFullscreen();
});
$("#vol").addEventListener("input", () => {
  volume = Number($("#vol").value);
  muted = false;
  $("#mute").textContent = "🔇 Mudo";
  $("#volTxt").textContent = `${volume}%`;
});
$("#vol").addEventListener("change", applyVolume);

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  const { site } = await chrome.storage.local.get("site");
  $("#site").value = site || DEFAULT_SITE;
  render(await getQueue());
  const st = await readState();
  $("#found").textContent = applyFound(st) ? "Embed já capturado — confira o título." : "Clique em Procurar embed.";
  try {
    const host = new URL(tab.url || "about:blank").hostname;
    $("#tab").textContent = host ? `— ${host}` : "";
  } catch (e) {}
  say("v1.0.6 pronta — controle o player desta aba.");
})();
