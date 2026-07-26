export type EmbedCommandAction =
  | 'state'
  | 'play'
  | 'pause'
  | 'toggle'
  | 'seek'
  | 'seekTo'
  | 'volume'
  | 'mute'
  | 'rate'
  | 'fullscreen'
  | 'reload';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

export const supportsEmbedPostMessage = (src?: string | null) => {
  if (!src) return false;
  try {
    const url = new URL(src, window.location.href);
    const host = url.hostname.toLowerCase();
    return host.includes('youtube.com') || host.includes('youtu.be') || host.includes('vimeo.com');
  } catch {
    return false;
  }
};

export const getEmbedIframe = () => {
  if (!isBrowser()) return null;
  return document.querySelector('[data-rc-frame] iframe') as HTMLIFrameElement | null;
};

export const focusEmbedIframe = () => {
  const iframe = getEmbedIframe();
  if (!iframe) return false;
  iframe.focus();
  return true;
};

const safePost = (target: Window, message: unknown) => {
  try {
    target.postMessage(message, '*');
  } catch {
    // Ignore providers that reject unknown postMessage payloads.
  }
};

const controlSameOriginVideo = (action: EmbedCommandAction, value?: number) => {
  const iframe = getEmbedIframe();
  if (!iframe) return false;

  try {
    const doc = iframe.contentDocument;
    const video = doc?.querySelector('video') as HTMLVideoElement | null;
    if (!video) return false;

    if (action === 'play') void video.play();
    else if (action === 'pause') video.pause();
    else if (action === 'toggle') video.paused ? void video.play() : video.pause();
    else if (action === 'seek') video.currentTime = Math.max(0, video.currentTime + (value ?? 0));
    else if (action === 'seekTo') video.currentTime = Math.max(0, value ?? 0);
    else if (action === 'volume') {
      video.volume = Math.min(1, Math.max(0, value ?? video.volume));
      video.muted = false;
    } else if (action === 'mute') video.muted = !video.muted;
    else if (action === 'rate') video.playbackRate = value ?? 1;
    else return false;

    return true;
  } catch {
    return false;
  }
};

export function postEmbedCommand(action: EmbedCommandAction, value?: number) {
  if (controlSameOriginVideo(action, value)) return true;

  const iframe = getEmbedIframe();
  const target = iframe?.contentWindow;
  if (!target) return false;

  iframe.focus();

  const youtubeCommand = (() => {
    if (action === 'play') return { event: 'command', func: 'playVideo', args: [] };
    if (action === 'pause') return { event: 'command', func: 'pauseVideo', args: [] };
    if (action === 'toggle') return { event: 'command', func: 'playVideo', args: [] };
    if (action === 'seekTo') return { event: 'command', func: 'seekTo', args: [value ?? 0, true] };
    if (action === 'volume') return { event: 'command', func: 'setVolume', args: [Math.round((value ?? 1) * 100)] };
    if (action === 'mute') return { event: 'command', func: 'mute', args: [] };
    if (action === 'rate') return { event: 'command', func: 'setPlaybackRate', args: [value ?? 1] };
    return null;
  })();

  const vimeoCommand = (() => {
    if (action === 'play' || action === 'toggle') return { method: 'play' };
    if (action === 'pause') return { method: 'pause' };
    if (action === 'seekTo') return { method: 'setCurrentTime', value: value ?? 0 };
    if (action === 'volume') return { method: 'setVolume', value: value ?? 1 };
    if (action === 'rate') return { method: 'setPlaybackRate', value: value ?? 1 };
    return null;
  })();

  if (youtubeCommand) safePost(target, JSON.stringify(youtubeCommand));
  if (vimeoCommand) safePost(target, vimeoCommand);

  safePost(target, { source: 'rynex-cine', type: 'RYNEX_EMBED_COMMAND', action, value });
  safePost(target, { command: action, value });
  safePost(target, { type: action, value });

  return true;
}

export function dispatchEmbedCommand(action: EmbedCommandAction, value?: number) {
  if (!isBrowser()) return false;
  window.dispatchEvent(new CustomEvent('rynex:embed-command', { detail: { action, value } }));
  return postEmbedCommand(action, value);
}