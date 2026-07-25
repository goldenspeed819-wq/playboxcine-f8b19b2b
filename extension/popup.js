const $ = (s) => document.querySelector(s);
let tabId = null;
let meta = {};

function pickBest(found) {
  const embeds = (found.embeds || []).filter(
    (u) => !/disqus\.com|\/embed\/comments|comments\/?\?/i.test(u)
  );
  const rc = embeds.find((u) => /RCServer|server\.php\?/i.test(u));
  return rc || embeds[0] || "";
}

async function clickEmbedInAllFrames() {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        const textOf = (el) =>
          (
            (el.textContent || "") +
            " " +
            ((el.className || "") &&
              (el.className.baseVal !== undefined ? el.className.baseVal : el.className)) +
            " " +
            (el.id || "") +
            " " +
            (["aria-label", "alt", "title", "data-title", "data-tooltip", "onclick"]
              .map((a) => (el.getAttribute && el.getAttribute(a)) || "")
              .join(" "))
          ).toLowerCase();
        const fire = (el) => {
          ["pointerover", "mouseover", "pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach((t) => {
            try {
              el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
            } catch (e) {}
          });
          try {
            el.click();
          } catch (e) {}
        };
        const nodes = [
          ...document.querySelectorAll(
            'a,button,div,span,li,td,img,[role="button"],[onclick],[class*="embed" i],[id*="embed" i],[aria-label*="embed" i],[title*="embed" i]'
          ),
        ];
        let clicks = 0;
        nodes.forEach((el) => {
          const txt = textOf(el).trim();
          const rect = el.getBoundingClientRect();
          const isEmbed = txt === "embed" || /^embed\b/.test(txt) || txt.includes(" embed") || txt.includes("embed ");
          if (!isEmbed || rect.width <= 0 || rect.height <= 0 || rect.width > 500 || rect.height > 220) return;
          if (el.children && el.children.length > 5) return;
          fire(el);
          clicks += 1;
        });
        return clicks;
      },
    });
  } catch (e) {}
}

async function getQueue() {
  const { queue = [] } = await chrome.storage.local.get("queue");
  return queue;
}

async function setQueue(q) {
  await chrome.storage.local.set({ queue: q });
  render(q);
}

function render(q) {
  $("#count").textContent = `— ${q.length} na fila`;
  $("#list").innerHTML = q
    .map(
      (i, idx) =>
        `<div class="item"><div class="t">${i.type === "series" ? "📺" : "🎬"} ${i.title}</div><div class="u">${i.videos[0]?.url || ""}</div><button class="ghost" data-i="${idx}" style="margin-top:6px;padding:4px 8px;font-size:11px">Remover</button></div>`
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

async function scan() {
  $("#found").textContent = "Procurando...";
  await clickEmbedInAllFrames();
  try {
    await chrome.tabs.sendMessage(tabId, { type: "SCAN" });
  } catch (e) {}
  await new Promise((r) => setTimeout(r, 6000));
  const found = await chrome.runtime.sendMessage({ type: "GET", tabId });
  const m = await chrome.tabs.sendMessage(tabId, { type: "META" }).catch(() => ({}));
  meta = m || {};
  if (!$("#title").value) $("#title").value = meta.title || "";
  const best = pickBest(found);
  if (best) $("#url").value = best;
  $("#found").textContent = `${(found.embeds || []).length} embed(s) válido(s)`;
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
    videos: [{ url, type: "EMBED" }],
  });
  await setQueue(q);
  $("#url").value = "";
  $("#title").value = "";
  $("#found").textContent = "Adicionado!";
}

$("#scan").addEventListener("click", scan);
$("#add").addEventListener("click", add);
$("#clear").addEventListener("click", () => setQueue([]));
$("#copy").addEventListener("click", async () => {
  const q = await getQueue();
  const json = JSON.stringify(
    { results: q, total_itens: q.length, data_extracao: new Date().toLocaleString("pt-BR") },
    null,
    2
  );
  await navigator.clipboard.writeText(json);
  $("#found").textContent = "JSON copiado!";
});

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  render(await getQueue());
  scan();
})();