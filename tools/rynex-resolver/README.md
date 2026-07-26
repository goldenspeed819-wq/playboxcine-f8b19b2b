# Rynex Resolver

Substitui a extensão do Chrome. Ele abre a página do provedor (RedeCanais etc.)
em um navegador real, passa pelo Cloudflare, escuta a rede e devolve o link
direto do vídeo (.m3u8 / .mp4). O Rynex então reproduz no player nativo.

## Rodar

```bash
cd tools/rynex-resolver
npm install
npx playwright install chromium
npm start          # sobe em http://localhost:8791
```

Deixe uma URL pública (ex.: `npx localtunnel --port 8791` ou Cloudflare Tunnel)
e cadastre-a no Rynex como o segredo `RESOLVER_URL`.

## API

POST `/resolve` `{ "url": "https://redecanais.../player3/server.php?..." }`
→ `{ "success": true, "stream": "...", "referer": "..." }`
