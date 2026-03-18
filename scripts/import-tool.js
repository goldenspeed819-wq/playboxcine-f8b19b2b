#!/usr/bin/env node
/**
 * PlayBoxCine - Ferramenta de Importação Rápida (Script Externo)
 * 
 * USO:
 *   node scripts/import-tool.js import-series --title "One Piece" --abbrev "ONEPC" --domain "redecanais.cafe" --server 21
 *   node scripts/import-tool.js import-movie --title "Interstellar" --abbrev "INTRSTLLR" --domain "redecanais.cafe"
 *   node scripts/import-tool.js import-json --file data.json --type mixed
 *   node scripts/import-tool.js update-urls --find "redecanais.cafe" --replace "redecanais.ooo"
 *   node scripts/import-tool.js check-episodes --all
 *   node scripts/import-tool.js check-episodes --series-id "uuid-here"
 * 
 * REQUISITOS:
 *   - Node.js 18+
 *   - Variáveis de ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY
 * 
 * FORMATO JSON MISTO:
 *   [
 *     { "type": "movie", "titulo": "...", "vid": "ABREV" },
 *     { "type": "series", "titulo": "...", "vid": "ABREV", "tmdb_id": 12345 }
 *   ]
 */

const https = require('https');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_ORIG = 'https://image.tmdb.org/t/p/original';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, { headers: { 'User-Agent': 'PlayBoxCine-Import/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function titleToVid(title) {
  let t = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/e/g, '').replace(/[^A-Za-z0-9]/g, '');
  return t.toUpperCase();
}

function buildUrl(domain, server, vid, template) {
  const tpl = template || '//{DOMAIN}/player3/server.php?server=RCServer{SERVER}&subfolder=ondemand&vid={VID}';
  return tpl.replace(/\{DOMAIN\}/g, domain).replace(/\{SERVER\}/g, server || '21').replace(/\{VID\}/g, vid);
}

// ====== IMPORT SERIES ======
async function importSeries(args) {
  const title = args.title;
  const abbrev = args.abbrev;
  const domain = args.domain || 'redecanais.cafe';
  const server = args.server || '21';
  const template = args.template;
  const epFormat = args.format || '2'; // 2=01, 3=001

  if (!title || !abbrev) { console.error('❌ --title e --abbrev são obrigatórios'); return; }
  if (!TMDB_API_KEY) { console.error('❌ TMDB_API_KEY não configurada'); return; }

  console.log(`🔍 Buscando "${title}" no TMDB...`);
  const searchData = await httpGet(`${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}`);
  if (!searchData.results?.length) { console.error('❌ Série não encontrada'); return; }

  const show = searchData.results[0];
  console.log(`✅ Encontrado: ${show.name} (${show.first_air_date?.substring(0,4)})`);

  const details = await httpGet(`${TMDB_BASE}/tv/${show.id}?api_key=${TMDB_API_KEY}&language=pt-BR`);
  const genres = (details.genres || []).map(g => g.name);

  // Insert series
  const seriesPayload = {
    title: details.name || show.name,
    description: details.overview || '',
    thumbnail: show.poster_path ? `${TMDB_IMG}${show.poster_path}` : null,
    release_year: show.first_air_date ? parseInt(show.first_air_date.substring(0,4)) : null,
    category: genres.join(', '),
    rating: 'Livre',
    tmdb_id: show.id,
  };

  const seriesRes = await supabaseRequest('POST', '/rest/v1/series', seriesPayload);
  const seriesId = Array.isArray(seriesRes) ? seriesRes[0]?.id : seriesRes?.id;
  if (!seriesId) { console.error('❌ Erro ao criar série:', seriesRes); return; }

  console.log(`📺 Série criada: ${seriesPayload.title} (ID: ${seriesId})`);

  const padLen = parseInt(epFormat);
  let totalEps = 0;

  for (const season of (details.seasons || [])) {
    if (season.season_number === 0) continue;
    
    const seasonData = await httpGet(`${TMDB_BASE}/tv/${show.id}/season/${season.season_number}?api_key=${TMDB_API_KEY}&language=pt-BR`);
    if (!seasonData.episodes) continue;

    const episodes = seasonData.episodes.map(ep => {
      const sStr = String(season.season_number).padStart(padLen, '0');
      const eStr = String(ep.episode_number).padStart(padLen, '0');
      const vid = `${abbrev.toUpperCase()}T${sStr}EP${eStr}`;
      return {
        series_id: seriesId,
        season: season.season_number,
        episode: ep.episode_number,
        title: ep.name || `Episódio ${ep.episode_number}`,
        description: ep.overview || null,
        thumbnail: ep.still_path ? `${TMDB_IMG}${ep.still_path}` : null,
        video_url: buildUrl(domain, server, vid, template),
      };
    });

    // Insert in batches of 50
    for (let i = 0; i < episodes.length; i += 50) {
      const batch = episodes.slice(i, i + 50);
      await supabaseRequest('POST', '/rest/v1/episodes', batch);
    }

    totalEps += episodes.length;
    console.log(`  📄 T${season.season_number}: ${episodes.length} episódios`);
    await sleep(300);
  }

  console.log(`\n✅ ${totalEps} episódios importados para "${seriesPayload.title}"`);
}

// ====== IMPORT MOVIE ======
async function importMovie(args) {
  const title = args.title;
  const abbrev = args.abbrev;
  const domain = args.domain || 'redecanais.cafe';
  const server = args.server || '21';
  const template = args.template;

  if (!title || !abbrev) { console.error('❌ --title e --abbrev são obrigatórios'); return; }

  let metadata = { title };
  if (TMDB_API_KEY) {
    console.log(`🔍 Buscando "${title}" no TMDB...`);
    const data = await httpGet(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}`);
    if (data.results?.length) {
      const m = data.results[0];
      const detailData = await httpGet(`${TMDB_BASE}/movie/${m.id}?api_key=${TMDB_API_KEY}&language=pt-BR`);
      metadata = {
        title: m.title || title,
        description: m.overview || '',
        thumbnail: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
        cover: m.backdrop_path ? `${TMDB_IMG_ORIG}${m.backdrop_path}` : null,
        release_year: m.release_date ? parseInt(m.release_date.substring(0,4)) : null,
        category: (detailData.genres || []).map(g => g.name).join(', '),
        rating: 'Livre',
        duration: detailData.runtime ? `${detailData.runtime}min` : null,
      };
    }
  }

  const vid = abbrev.toUpperCase();
  const url = buildUrl(domain, server, vid, template);

  const res = await supabaseRequest('POST', '/rest/v1/movies', { ...metadata, video_url: url });
  console.log(`✅ Filme importado: ${metadata.title}`);
}

// ====== IMPORT JSON (MIXED) ======
async function importJson(args) {
  const file = args.file;
  const type = args.type || 'mixed'; // movie, series, mixed
  const domain = args.domain || 'redecanais.cafe';
  const server = args.server || '21';
  const template = args.template;
  const format = args.format || '2';

  if (!file) { console.error('❌ --file é obrigatório'); return; }

  const raw = fs.readFileSync(file, 'utf-8');
  const data = JSON.parse(raw);
  const items = Array.isArray(data) ? data : Object.values(data);

  console.log(`📦 ${items.length} itens no JSON`);

  let movies = 0, series = 0, errors = 0;

  for (const item of items) {
    const itemType = item.type || item.tipo || type;
    const titulo = item.titulo || item.title || '';
    const vid = item.vid || titleToVid(titulo);
    
    try {
      if (itemType === 'serie' || itemType === 'series' || itemType === 'tv') {
        // Import as series
        const tmdbId = item.tmdb_id;
        if (tmdbId && TMDB_API_KEY) {
          await importSeries({
            title: titulo,
            abbrev: vid,
            domain, server, template, format,
          });
          series++;
        } else {
          // Simple series without episodes
          await supabaseRequest('POST', '/rest/v1/series', {
            title: titulo,
            description: item.descricao || item.description || '',
            thumbnail: item.thumbnail || null,
            release_year: item.ano ? parseInt(String(item.ano)) : null,
            category: item.categoria || item.category || null,
            rating: item.classificacao || 'Livre',
            tmdb_id: tmdbId || null,
          });
          series++;
        }
      } else {
        // Import as movie
        const url = item.embed_url || buildUrl(domain, server, vid, template);
        await supabaseRequest('POST', '/rest/v1/movies', {
          title: titulo,
          description: item.descricao || item.description || '',
          thumbnail: item.thumbnail || null,
          cover: item.cover || null,
          release_year: item.ano ? parseInt(String(item.ano)) : null,
          category: item.categoria || item.category || null,
          rating: item.classificacao || 'Livre',
          video_url: url,
        });
        movies++;
      }
    } catch (e) {
      console.error(`❌ Erro em "${titulo}": ${e}`);
      errors++;
    }

    if ((movies + series) % 10 === 0) {
      console.log(`  📊 Progresso: ${movies} filmes, ${series} séries, ${errors} erros`);
    }
    await sleep(200);
  }

  console.log(`\n✅ Importação concluída: ${movies} filmes, ${series} séries, ${errors} erros`);
}

// ====== UPDATE URLS ======
async function updateUrls(args) {
  const find = args.find;
  const replace = args.replace;

  if (!find || !replace) { console.error('❌ --find e --replace são obrigatórios'); return; }

  console.log(`🔄 Substituindo "${find}" por "${replace}"...`);

  // Movies
  const moviesRes = await supabaseRequest('GET', `/rest/v1/movies?select=id,video_url,video_url_part2&video_url=ilike.*${encodeURIComponent(find)}*`);
  let movieCount = 0;
  if (Array.isArray(moviesRes)) {
    for (const m of moviesRes) {
      const updates = {};
      if (m.video_url?.includes(find)) updates.video_url = m.video_url.replaceAll(find, replace);
      if (m.video_url_part2?.includes(find)) updates.video_url_part2 = m.video_url_part2.replaceAll(find, replace);
      if (Object.keys(updates).length) {
        await supabaseRequest('PATCH', `/rest/v1/movies?id=eq.${m.id}`, updates);
        movieCount++;
      }
    }
  }

  // Episodes
  const epsRes = await supabaseRequest('GET', `/rest/v1/episodes?select=id,video_url&video_url=ilike.*${encodeURIComponent(find)}*`);
  let epCount = 0;
  if (Array.isArray(epsRes)) {
    for (const ep of epsRes) {
      if (ep.video_url?.includes(find)) {
        await supabaseRequest('PATCH', `/rest/v1/episodes?id=eq.${ep.id}`, { video_url: ep.video_url.replaceAll(find, replace) });
        epCount++;
      }
    }
  }

  console.log(`✅ ${movieCount} filme(s) e ${epCount} episódio(s) atualizados`);
}

// ====== CHECK NEW EPISODES ======
async function checkEpisodes(args) {
  console.log('🔍 Verificando novos episódios via TMDB...');
  
  const url = `${SUPABASE_URL}/functions/v1/auto-episodes`;
  const res = await httpGet(url); // This calls the edge function
  console.log(JSON.stringify(res, null, 2));
}

// ====== CLI ======
async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (rest[i]?.startsWith('--')) {
      args[rest[i].replace('--', '')] = rest[i + 1] || 'true';
    }
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Configure: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    console.error('   export SUPABASE_URL=https://xxx.supabase.co');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY=eyJ...');
    process.exit(1);
  }

  switch (command) {
    case 'import-series': await importSeries(args); break;
    case 'import-movie': await importMovie(args); break;
    case 'import-json': await importJson(args); break;
    case 'update-urls': await updateUrls(args); break;
    case 'check-episodes': await checkEpisodes(args); break;
    default:
      console.log(`
📦 PlayBoxCine Import Tool

Comandos:
  import-series  --title "Nome" --abbrev "ABREV" [--domain x] [--server 21] [--format 2|3]
  import-movie   --title "Nome" --abbrev "ABREV" [--domain x] [--server 21]
  import-json    --file data.json [--type movie|series|mixed] [--domain x] [--format 2|3]
  update-urls    --find "dominio.old" --replace "dominio.new"
  check-episodes [--all]

Variáveis de ambiente:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TMDB_API_KEY
      `);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
