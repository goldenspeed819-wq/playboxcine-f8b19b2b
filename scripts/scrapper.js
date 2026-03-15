#!/usr/bin/env node
/**
 * RynexCine Scrapper - Extrai filmes e séries de múltiplas fontes em JSON
 * 
 * USO:
 *   node scripts/scrapper.js --source tmdb --type movie --pages 5
 *   node scripts/scrapper.js --source tmdb --type tv --pages 3
 *   node scripts/scrapper.js --source redecanais --output filmes.json
 *   node scripts/scrapper.js --source imdb --type movie --top 250
 * 
 * REQUISITOS:
 *   - Node.js 18+
 *   - Variável TMDB_API_KEY no ambiente (para TMDB)
 * 
 * SAÍDA: Gera arquivo JSON compatível com o importador do RynexCine
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============ CONFIG ============
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// ============ UTILS ============
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RynexCine-Scrapper/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch { resolve(data); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function titleToVid(title) {
  let t = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  t = t.replace(/e/g, '');
  t = t.replace(/[^A-Za-z0-9]/g, '');
  return t.toUpperCase();
}

const PLAYER_BASE = 'https://redecanais.cafe/player3/server.php?server=RCServer26&subfolder=ondemand&vid=';

// ============ TMDB SCRAPPER ============
async function scrapeTMDB(type, pages) {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY não configurada. Defina: export TMDB_API_KEY=sua_chave');
    process.exit(1);
  }

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const results = [];
  
  console.log(`🎬 Buscando ${mediaType} populares do TMDB (${pages} páginas)...`);

  for (let page = 1; page <= pages; page++) {
    const url = `${TMDB_BASE}/${mediaType}/popular?api_key=${TMDB_API_KEY}&language=pt-BR&page=${page}`;
    const data = await httpGet(url);
    
    if (!data.results) {
      console.error(`Erro na página ${page}:`, data);
      continue;
    }

    for (const item of data.results) {
      const title = mediaType === 'movie' ? item.title : item.name;
      const year = (mediaType === 'movie' ? item.release_date : item.first_air_date || '').substring(0, 4);
      
      // Get genres
      let genreUrl = `${TMDB_BASE}/${mediaType}/${item.id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
      const details = await httpGet(genreUrl);
      
      const genres = details.genres ? details.genres.map(g => g.name) : [];
      const vid = titleToVid(title);

      results.push({
        titulo: title,
        titulo_original: mediaType === 'movie' ? item.original_title : item.original_name,
        ano: year,
        descricao: item.overview || '',
        categoria: genres[0] || 'Outros',
        categorias: genres,
        nota: item.vote_average ? item.vote_average.toFixed(1) : null,
        thumbnail: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null,
        cover: item.backdrop_path ? `${TMDB_IMG_ORIGINAL}${item.backdrop_path}` : null,
        tmdb_id: item.id,
        tipo: mediaType === 'movie' ? 'filme' : 'serie',
        url: '', // slug placeholder
        embed_url: `${PLAYER_BASE}${vid}`,
        vid: vid,
        duracao: details.runtime ? `${details.runtime}min` : null,
        classificacao: item.adult ? '18+' : 'Livre',
      });

      await sleep(250); // Rate limit
    }

    console.log(`  📄 Página ${page}/${pages} - ${data.results.length} itens`);
    await sleep(500);
  }

  return results;
}

// ============ IMDB TOP 250 (via TMDB) ============
async function scrapeIMDBTop(type, limit) {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY não configurada.');
    process.exit(1);
  }

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  const results = [];
  
  console.log(`🏆 Buscando top ${limit} ${mediaType} do IMDB (via TMDB)...`);

  const pages = Math.ceil(limit / 20);
  for (let page = 1; page <= pages; page++) {
    const url = `${TMDB_BASE}/${mediaType}/top_rated?api_key=${TMDB_API_KEY}&language=pt-BR&page=${page}`;
    const data = await httpGet(url);
    
    if (!data.results) continue;

    for (const item of data.results) {
      if (results.length >= limit) break;
      
      const title = mediaType === 'movie' ? item.title : item.name;
      const year = (mediaType === 'movie' ? item.release_date : item.first_air_date || '').substring(0, 4);
      const vid = titleToVid(title);

      results.push({
        titulo: title,
        ano: year,
        descricao: item.overview || '',
        nota: item.vote_average ? item.vote_average.toFixed(1) : null,
        thumbnail: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null,
        cover: item.backdrop_path ? `${TMDB_IMG_ORIGINAL}${item.backdrop_path}` : null,
        tmdb_id: item.id,
        tipo: mediaType === 'movie' ? 'filme' : 'serie',
        embed_url: `${PLAYER_BASE}${vid}`,
        vid: vid,
      });
    }

    console.log(`  📄 Página ${page}/${pages}`);
    await sleep(500);
  }

  return results.slice(0, limit);
}

// ============ TRENDING (TMDB) ============
async function scrapeTrending(type, timeWindow = 'week') {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY não configurada.');
    process.exit(1);
  }

  const mediaType = type === 'all' ? 'all' : (type === 'tv' ? 'tv' : 'movie');
  console.log(`🔥 Buscando trending ${mediaType} (${timeWindow})...`);

  const results = [];
  for (let page = 1; page <= 5; page++) {
    const url = `${TMDB_BASE}/trending/${mediaType}/${timeWindow}?api_key=${TMDB_API_KEY}&language=pt-BR&page=${page}`;
    const data = await httpGet(url);
    if (!data.results) continue;

    for (const item of data.results) {
      const isMovie = item.media_type === 'movie' || type === 'movie';
      const title = isMovie ? (item.title || item.name) : (item.name || item.title);
      const year = (isMovie ? item.release_date : item.first_air_date || '').substring(0, 4);
      const vid = titleToVid(title);

      results.push({
        titulo: title,
        ano: year,
        descricao: item.overview || '',
        thumbnail: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null,
        cover: item.backdrop_path ? `${TMDB_IMG_ORIGINAL}${item.backdrop_path}` : null,
        tipo: isMovie ? 'filme' : 'serie',
        embed_url: `${PLAYER_BASE}${vid}`,
        vid: vid,
        nota: item.vote_average ? item.vote_average.toFixed(1) : null,
      });
    }
    await sleep(300);
  }

  return results;
}

// ============ SEARCH (TMDB) ============
async function searchTMDB(query, type) {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY não configurada.');
    process.exit(1);
  }

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  console.log(`🔍 Buscando "${query}" no TMDB...`);

  const url = `${TMDB_BASE}/search/${mediaType}?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`;
  const data = await httpGet(url);
  
  if (!data.results) return [];

  return data.results.map(item => {
    const title = mediaType === 'movie' ? item.title : item.name;
    const year = (mediaType === 'movie' ? item.release_date : item.first_air_date || '').substring(0, 4);
    const vid = titleToVid(title);
    return {
      titulo: title,
      ano: year,
      descricao: item.overview || '',
      thumbnail: item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null,
      tipo: mediaType === 'movie' ? 'filme' : 'serie',
      embed_url: `${PLAYER_BASE}${vid}`,
      vid: vid,
    };
  });
}

// ============ CLI ============
async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };

  const source = getArg('source') || 'tmdb';
  const type = getArg('type') || 'movie';
  const pages = parseInt(getArg('pages') || '3');
  const output = getArg('output') || `scrapped_${type}_${Date.now()}.json`;
  const top = parseInt(getArg('top') || '100');
  const query = getArg('query');
  const limit = parseInt(getArg('limit') || '0'); // 0 = sem limite

  let results = [];

  switch (source) {
    case 'tmdb':
      if (query) {
        results = await searchTMDB(query, type);
      } else {
        results = await scrapeTMDB(type, pages);
      }
      break;
    case 'imdb':
      results = await scrapeIMDBTop(type, top);
      break;
    case 'trending':
      results = await scrapeTrending(type);
      break;
    default:
      console.error(`❌ Fonte desconhecida: ${source}. Use: tmdb, imdb, trending`);
      process.exit(1);
  }

  // Save output
  const outputPath = path.resolve(output);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✅ ${results.length} itens salvos em: ${outputPath}`);
  console.log(`\n📋 Para importar no RynexCine:`);
  console.log(`   1. Abra o painel Admin → Abastecer Site`);
  console.log(`   2. Carregue o arquivo JSON gerado`);
  console.log(`   3. Selecione o tipo (Filme/Série)`);
  console.log(`   4. Clique em "Analisar JSON" → "Iniciar Importação"`);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});