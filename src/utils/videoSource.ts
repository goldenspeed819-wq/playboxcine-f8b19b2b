export function getSourceType(url: string) {
  if (!url) return 'unknown';

  // 1️⃣ vídeo direto (mp4, webm)
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    return 'video';
  }

  // 2️⃣ players externos (MixDrop, DodStream etc)
  if (
    url.includes('mixdrop') ||
    url.includes('dodstream') ||
    url.includes('streamtape') ||
    url.includes('/e/') ||
    url.includes('redirect.php')
  ) {
    return 'iframe';
  }

  // 3️⃣ YouTube / Vimeo
  if (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('vimeo.com')
  ) {
    return 'iframe';
  }

  return 'unknown';
}
