import http from 'node:http';
import { chromium } from 'playwright';

const PORT = Number(process.env.PORT || 8791);
const TOKEN = process.env.RESOLVER_TOKEN || '';
const TIMEOUT = Number(process.env.RESOLVE_TIMEOUT || 45000);

const STREAM_RE = /\.(m3u8|mp4)(\?|$)/i;
const SEGMENT_RE = /\.ts(\?|$)/i;

let browserPromise = null;
const getBrowser = async () => {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true });
  return browserPromise;
};

function score(url) {
  if (/master\.m3u8/i.test(url)) return 0;
  if (/\.m3u8/i.test(url)) return 1;
  return 2;
}

/** Mesma lógica da extensão: entra na página, segue iframes e captura o stream. */
async function resolve(target) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'pt-BR',
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  const found = new Set();

  page.on('request', (req) => {
    const u = req.url();
    if (STREAM_RE.test(u) && !SEGMENT_RE.test(u)) found.add(u);
  });
  page.on('response', (res) => {
    const u = res.url();
    if (STREAM_RE.test(u) && !SEGMENT_RE.test(u)) found.add(u);
  });

  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    // dá tempo do desafio do Cloudflare resolver sozinho
    await page.waitForTimeout(3500);

    // tenta dar play (o stream só aparece depois do gesto em muitos players)
    for (const frame of page.frames()) {
      await frame
        .evaluate(() => {
          document.querySelectorAll('video').forEach((v) => {
            v.muted = true;
            v.play().catch(() => {});
          });
          const btn = document.querySelector(
            '.vjs-big-play-button, .play, [class*="play"], button'
          );
          if (btn) btn.click();
        })
        .catch(() => {});
    }

    const deadline = Date.now() + TIMEOUT;
    while (found.size === 0 && Date.now() < deadline) {
      await page.waitForTimeout(500);
      // procura src direto no DOM de todos os frames
      for (const frame of page.frames()) {
        const src = await frame
          .evaluate(() => {
            const v = document.querySelector('video');
            const s = v && (v.currentSrc || v.src);
            if (s && !s.startsWith('blob:')) return s;
            const html = document.documentElement.innerHTML;
            const m = html.match(/https?:\/\/[^"'\s<>\\]+\.(?:m3u8|mp4)(?:\?[^"'\s<>\\]*)?/i);
            return m ? m[0] : null;
          })
          .catch(() => null);
        if (src) found.add(src);
      }
    }

    const streams = [...found].sort((a, b) => score(a) - score(b));
    if (!streams.length) return { success: false, error: 'Nenhum stream encontrado' };

    const referer = new URL(page.url()).origin + '/';
    return { success: true, stream: streams[0], referer, all: streams.slice(0, 10) };
  } finally {
    await context.close().catch(() => {});
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.end('{}');
  if (req.method === 'GET') return res.end(JSON.stringify({ ok: true, version: '1.0.0' }));
  if (req.method !== 'POST' || !req.url.startsWith('/resolve')) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'not found' }));
  }
  if (TOKEN && req.headers['x-resolver-token'] !== TOKEN) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  let url = '';
  try {
    url = JSON.parse(body || '{}').url || '';
  } catch {
    /* ignore */
  }
  if (!/^https?:\/\//i.test(url)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'url inválida' }));
  }

  try {
    res.end(JSON.stringify(await resolve(url)));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: String(e && e.message ? e.message : e) }));
  }
});

server.listen(PORT, () => console.log(`Rynex Resolver em http://localhost:${PORT}`));
