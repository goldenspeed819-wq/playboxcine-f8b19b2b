export function getSourceType(url: string) {
  if (!url) return 'unknown';

  // 1️⃣ vídeo direto (mp4, webm, ogg, m3u8, mpd) - including supabase storage
  if (url.match(/\.(mp4|webm|ogg|m3u8|mpd)(\?|$)/i)) {
    return 'video';
  }

  // 1b️⃣ streams diretos sem extensão (ex.: brflix dynamic-proxy /stream/ID?hash=)
  if (/\/dynamic-proxy\//i.test(url) || /\/stream\/\d+(\?|$)/i.test(url)) {
    return 'video';
  }

  // 1c️⃣ URLs de proxy hospedadas na Vercel/similares (ex.: fenixbot.squareweb.app, *.vercel.app)
  // tratadas como vídeo direto: mesmo player nativo dos uploads MP4
  if (/\.vercel\.app/i.test(url) || /\.squareweb\.app/i.test(url)) {
    return 'video';
  }

  // 2️⃣ Supabase storage URLs are always direct video
  if (url.includes('supabase') && url.includes('/storage/')) {
    return 'video';
  }

  // 3️⃣ Only known embed/player pages use iframe. Every other URL is
  // treated as a direct video so it gets the native Rynex player + autoplay.
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const embedPattern = /(redecanais|rcserver|youtube\.com|youtu\.be|vimeo\.com|mixdrop|dood|streamtape|filemoon|voe\.sx|ok\.ru|dailymotion|\/e\/|\/embed|\/player|\.php(\?|$)|\.html?(\?|$))/i;
    return embedPattern.test(url) ? 'iframe' : 'video';
  }

  return 'unknown';
}
