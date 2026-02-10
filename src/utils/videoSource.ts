export function getSourceType(url: string) {
  if (!url) return 'unknown';

  // 1️⃣ vídeo direto (mp4, webm, ogg) - including supabase storage
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    return 'video';
  }

  // 2️⃣ Supabase storage URLs are always direct video
  if (url.includes('supabase') && url.includes('/storage/')) {
    return 'video';
  }

  // 3️⃣ Any external URL that isn't a direct video file = iframe
  // This covers: mixdrop, dodstream, streamtape, youtube, vimeo,
  // redirect.php, /e/ embeds, and ANY other external player
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'iframe';
  }

  return 'unknown';
}
