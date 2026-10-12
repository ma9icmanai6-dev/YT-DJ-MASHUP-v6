/**
 * YouTube IFrame API & Archive.org HTML5 Audio/Video Controller
 */

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoadedPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (apiLoadedPromise) return apiLoadedPromise;

  apiLoadedPromise = new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      resolve();
      return;
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve();
    };

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
  });

  return apiLoadedPromise;
}

export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const clean = urlOrId.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = clean.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }

  return null;
}

export interface YTPlayerWrapper {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  loadVideoById: (id: string, startSeconds?: number) => void;
  cueVideoById: (id: string, startSeconds?: number) => void;
  destroy: () => void;
  getRawPlayer: () => any;
}

// Keep a singleton cache per elementId so React re-renders never double-init the same YT DOM node
const activeYtPlayers = new Map<string, YTPlayerWrapper>();
const activeYtHandlers = new Map<
  string,
  {
    onReady?: (player: YTPlayerWrapper) => void;
    onStateChange?: (state: number) => void;
    onError?: (error: any) => void;
  }
>();

const activeBgPlayers = new Map<
  string,
  {
    loadVideo: (videoId: string, startSeconds?: number) => void;
    ensurePlaying: () => void;
    seekTo: (seconds: number) => void;
    setPlaybackRate: (rate: number) => void;
  }
>();

/**
 * Dedicated flicker-free muted background YouTube video player for the bottom layer under each Deck.
 * Never unmounts the iframe when switching tracks and automatically loops and recovers on error.
 */
export async function createYTBackgroundPlayer(
  elementId: string,
  initialVideoId: string,
  initialStartSeconds: number = 0,
  fallbackVideoId: string = 'dwDns8x3Jb4'
) {
  const existing = activeBgPlayers.get(elementId);
  if (existing) {
    existing.loadVideo(initialVideoId, initialStartSeconds);
    return existing;
  }

  let rawPlayer: any = null;
  let isReady = false;
  let currentId = initialVideoId;
  let currentStart = initialStartSeconds;
  let pendingLoad: { id: string; start: number } | null = null;

  const controller = {
    loadVideo: (videoId: string, startSeconds: number = 0) => {
      if (!videoId) return;
      if (currentId === videoId && isReady && rawPlayer) {
        controller.ensurePlaying();
        return;
      }
      currentId = videoId;
      currentStart = startSeconds;
      if (!isReady || !rawPlayer) {
        pendingLoad = { id: videoId, start: startSeconds };
        return;
      }
      try {
        if (typeof rawPlayer.mute === 'function') rawPlayer.mute();
        if (typeof rawPlayer.loadVideoById === 'function') {
          rawPlayer.loadVideoById({ videoId, startSeconds });
        }
      } catch {}
    },
    ensurePlaying: () => {
      if (!isReady || !rawPlayer) return;
      try {
        if (typeof rawPlayer.mute === 'function') rawPlayer.mute();
        const st = typeof rawPlayer.getPlayerState === 'function' ? rawPlayer.getPlayerState() : -1;
        if (st !== 1 && st !== 3 && typeof rawPlayer.playVideo === 'function') {
          rawPlayer.playVideo();
        }
      } catch {}
    },
    seekTo: (seconds: number) => {
      if (!isReady || !rawPlayer) return;
      try {
        if (typeof rawPlayer.seekTo === 'function') {
          rawPlayer.seekTo(Math.max(0, seconds), true);
        }
      } catch {}
    },
    setPlaybackRate: (rate: number) => {
      if (!isReady || !rawPlayer) return;
      try {
        if (typeof rawPlayer.setPlaybackRate === 'function') {
          rawPlayer.setPlaybackRate(Math.max(0.5, Math.min(2.0, rate)));
        }
      } catch {}
    },
  };

  activeBgPlayers.set(elementId, controller);

  await loadYouTubeIframeApi();

  const el = document.getElementById(elementId);
  if (!el) {
    activeBgPlayers.delete(elementId);
    return controller;
  }

  rawPlayer = new window.YT.Player(elementId, {
    videoId: currentId,
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      mute: 1,
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
      start: Math.max(0, Math.floor(currentStart)),
    },
    events: {
      onReady: () => {
        isReady = true;
        try {
          const iframe = typeof rawPlayer.getIframe === 'function' ? rawPlayer.getIframe() : null;
          if (iframe) {
            iframe.setAttribute('allow', 'autoplay; encrypted-media');
            iframe.style.pointerEvents = 'none';
          }
          if (typeof rawPlayer.mute === 'function') rawPlayer.mute();
          if (pendingLoad) {
            const { id, start } = pendingLoad;
            pendingLoad = null;
            rawPlayer.loadVideoById({ videoId: id, startSeconds: start });
          } else if (typeof rawPlayer.playVideo === 'function') {
            rawPlayer.playVideo();
          }
        } catch {}
      },
      onStateChange: (event: any) => {
        try {
          if (typeof rawPlayer.mute === 'function') rawPlayer.mute();
          // Loop seamlessly if ended (0) or restart if paused/cued (2, 5)
          if (event.data === 0) {
            rawPlayer.seekTo(currentStart || 0, true);
            rawPlayer.playVideo();
          } else if (event.data === 2 || event.data === 5 || event.data === -1) {
            rawPlayer.playVideo();
          }
        } catch {}
      },
      onError: () => {
        // Fallback so deck background video is never blank or flashing error screen
        if (currentId !== fallbackVideoId) {
          currentId = fallbackVideoId;
          try {
            if (typeof rawPlayer.mute === 'function') rawPlayer.mute();
            rawPlayer.loadVideoById({ videoId: fallbackVideoId, startSeconds: 10 });
          } catch {}
        }
      },
    },
  });

  return controller;
}

function computeBoostedYtVolume(vol: number): number {
  if (vol <= 0) return 0;
  const normalized = Math.max(0, vol) / 100;
  const boosted = Math.min(1, Math.pow(normalized, 0.5));
  return Math.max(1, Math.min(100, Math.round(boosted * 100)));
}

export async function createYTPlayer(
  elementId: string,
  videoId: string,
  handlers: {
    onReady?: (player: YTPlayerWrapper) => void;
    onStateChange?: (state: number) => void;
    onError?: (error: any) => void;
  } = {}
): Promise<YTPlayerWrapper> {
  activeYtHandlers.set(elementId, handlers);

  const existing = activeYtPlayers.get(elementId);
  if (existing) {
    if (handlers.onReady) handlers.onReady(existing);
    return existing;
  }

  let rawPlayer: any = null;
  let isReady = false;
  let currentVideoId = videoId;
  let currentStartSeconds = 0;
  let targetVolume = 100;
  let targetRate = 1;
  let pendingPlay = false;
  let pendingCue: { id: string; startSeconds: number; autoPlay: boolean } | null = null;

  const ensureIframeAllowAttributes = () => {
    try {
      const iframe =
        (rawPlayer && typeof rawPlayer.getIframe === 'function' && rawPlayer.getIframe()) ||
        document.getElementById(elementId);
      if (iframe && iframe.tagName === 'IFRAME') {
        iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
      }
    } catch {}
  };

  const applyUnmuteAndVolume = () => {
    try {
      if (!rawPlayer) return;
      if (targetVolume > 0 && typeof rawPlayer.unMute === 'function') {
        rawPlayer.unMute();
      }
      if (typeof rawPlayer.setVolume === 'function') {
        rawPlayer.setVolume(computeBoostedYtVolume(targetVolume));
      }
    } catch {}
  };

  const wrapper: YTPlayerWrapper = {
    play: () => {
      pendingPlay = true;
      if (!isReady || !rawPlayer) return;
      try {
        ensureIframeAllowAttributes();
        applyUnmuteAndVolume();
        if (typeof rawPlayer.playVideo === 'function') {
          rawPlayer.playVideo();
        }
        // Fallback if video was in CUED (5) or UNSTARTED (-1) state and didn't start within 250ms
        setTimeout(() => {
          try {
            if (!pendingPlay || !rawPlayer) return;
            applyUnmuteAndVolume();
            const st = typeof rawPlayer.getPlayerState === 'function' ? rawPlayer.getPlayerState() : -1;
            if (st !== 1 && st !== 3) {
              const curTime =
                (typeof rawPlayer.getCurrentTime === 'function' && rawPlayer.getCurrentTime()) ||
                currentStartSeconds ||
                0;
              if (typeof rawPlayer.loadVideoById === 'function' && currentVideoId) {
                rawPlayer.loadVideoById(currentVideoId, curTime);
              } else if (typeof rawPlayer.playVideo === 'function') {
                rawPlayer.playVideo();
              }
            }
          } catch {}
        }, 250);
      } catch (e) {
        console.warn('YT play error', e);
      }
    },
    pause: () => {
      pendingPlay = false;
      if (!isReady || !rawPlayer) return;
      try {
        if (typeof rawPlayer.pauseVideo === 'function') {
          rawPlayer.pauseVideo();
        }
      } catch (e) {
        console.warn('YT pause error', e);
      }
    },
    seekTo: (seconds: number, allowSeekAhead: boolean = true) => {
      currentStartSeconds = Math.max(0, seconds);
      if (!isReady || !rawPlayer) return;
      try {
        if (typeof rawPlayer.seekTo === 'function') {
          rawPlayer.seekTo(seconds, allowSeekAhead);
        }
      } catch (e) {
        console.warn('YT seek error', e);
      }
    },
    setVolume: (vol: number) => {
      targetVolume = Math.max(0, vol);
      if (!isReady || !rawPlayer) return;
      try {
        if (targetVolume <= 0) {
          if (typeof rawPlayer.setVolume === 'function') rawPlayer.setVolume(0);
        } else {
          applyUnmuteAndVolume();
        }
      } catch (e) {
        console.warn('YT volume error', e);
      }
    },
    setPlaybackRate: (rate: number) => {
      targetRate = rate;
      if (!isReady || !rawPlayer) return;
      try {
        if (typeof rawPlayer.setPlaybackRate === 'function') {
          rawPlayer.setPlaybackRate(rate);
        }
      } catch (e) {
        console.warn('YT playback rate error', e);
      }
    },
    getCurrentTime: () => {
      try {
        if (isReady && rawPlayer && typeof rawPlayer.getCurrentTime === 'function') {
          return rawPlayer.getCurrentTime() || 0;
        }
      } catch {}
      return currentStartSeconds || 0;
    },
    getDuration: () => {
      try {
        if (isReady && rawPlayer && typeof rawPlayer.getDuration === 'function') {
          return rawPlayer.getDuration() || 0;
        }
      } catch {}
      return 0;
    },
    getPlayerState: () => {
      try {
        if (isReady && rawPlayer && typeof rawPlayer.getPlayerState === 'function') {
          return rawPlayer.getPlayerState();
        }
      } catch {}
      return -1;
    },
    loadVideoById: (id: string, startSeconds: number = 0) => {
      currentVideoId = id;
      currentStartSeconds = startSeconds;
      pendingPlay = true;
      if (!isReady || !rawPlayer) {
        pendingCue = { id, startSeconds, autoPlay: true };
        return;
      }
      try {
        ensureIframeAllowAttributes();
        applyUnmuteAndVolume();
        try {
          rawPlayer.loadVideoById(id, startSeconds);
        } catch {
          rawPlayer.loadVideoById({ videoId: id, startSeconds });
        }
      } catch (e) {
        console.warn('YT loadVideoById error', e);
      }
    },
    cueVideoById: (id: string, startSeconds: number = 0) => {
      currentVideoId = id;
      currentStartSeconds = startSeconds;
      pendingPlay = false;
      if (!isReady || !rawPlayer) {
        pendingCue = { id, startSeconds, autoPlay: false };
        return;
      }
      try {
        ensureIframeAllowAttributes();
        try {
          rawPlayer.cueVideoById(id, startSeconds);
        } catch {
          rawPlayer.cueVideoById({ videoId: id, startSeconds });
        }
      } catch (e) {
        console.warn('YT cueVideoById error', e);
      }
    },
    destroy: () => {
      activeYtPlayers.delete(elementId);
      try {
        if (rawPlayer && typeof rawPlayer.destroy === 'function') {
          rawPlayer.destroy();
        }
      } catch {}
    },
    getRawPlayer: () => rawPlayer,
  };

  activeYtPlayers.set(elementId, wrapper);

  await loadYouTubeIframeApi();

  rawPlayer = new window.YT.Player(elementId, {
    videoId: currentVideoId,
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
    },
    events: {
      onReady: () => {
        isReady = true;
        ensureIframeAllowAttributes();
        applyUnmuteAndVolume();
        if (targetRate !== 1 && typeof rawPlayer.setPlaybackRate === 'function') {
          try {
            rawPlayer.setPlaybackRate(targetRate);
          } catch {}
        }

        if (pendingCue) {
          const { id, startSeconds, autoPlay } = pendingCue;
          pendingCue = null;
          if (autoPlay || pendingPlay) {
            wrapper.loadVideoById(id, startSeconds);
          } else {
            wrapper.cueVideoById(id, startSeconds);
          }
        } else if (pendingPlay) {
          wrapper.play();
        }

        const h = activeYtHandlers.get(elementId);
        if (h?.onReady) h.onReady(wrapper);
      },
      onStateChange: (event: any) => {
        if (event.data === 1 || event.data === 3) {
          // Force unMute & target volume whenever video starts playing or buffering!
          applyUnmuteAndVolume();
        }
        const h = activeYtHandlers.get(elementId);
        if (h?.onStateChange) h.onStateChange(event.data);
      },
      onError: (err: any) => {
        const h = activeYtHandlers.get(elementId);
        if (h?.onError) h.onError(err);
      },
    },
  });

  ensureIframeAllowAttributes();
  return wrapper;
}

/**
 * Creates a YTPlayerWrapper-compatible controller for Archive.org HTML5 <video>/<audio> elements.
 * Uses native HTML5 element audio (no crossOrigin="anonymous" or createMediaElementSource CORS lock)
 * so Archive.org CDN redirects play with 100% loud, uninterrupted audio!
 */
export function createArchivePlayer(
  elementId: string,
  mediaUrl: string,
  startSeconds: number = 0,
  handlers: {
    onReady?: (player: YTPlayerWrapper) => void;
    onStateChange?: (state: number) => void;
    onError?: (error: any) => void;
  } = {}
): YTPlayerWrapper | null {
  const el = document.getElementById(elementId) as HTMLVideoElement | null;
  if (!el) return null;

  // IMPORTANT: Do NOT set crossOrigin="anonymous" on Archive.org media elements
  // because Archive.org CDN nodes do not send Access-Control-Allow-Origin headers.
  el.removeAttribute('crossorigin');
  el.muted = false;
  el.volume = 1.0;
  el.src = mediaUrl;
  el.preload = 'auto';

  const onLoadedMetadata = () => {
    if (startSeconds > 0) {
      try {
        el.currentTime = startSeconds;
      } catch {}
    }
  };
  const onPlay = () => handlers.onStateChange?.(1);
  const onPause = () => handlers.onStateChange?.(2);
  const onEnded = () => handlers.onStateChange?.(0);
  const onError = (e: Event) => handlers.onError?.(e);

  el.onloadedmetadata = onLoadedMetadata;
  el.onplay = onPlay;
  el.onpause = onPause;
  el.onended = onEnded;
  el.onerror = onError;

  const wrapper: YTPlayerWrapper = {
    play: () => {
      el.muted = false;
      if (el.volume <= 0) el.volume = 1.0;
      el.play().catch((err) => console.warn('Archive player play error:', err));
    },
    pause: () => {
      el.pause();
    },
    seekTo: (seconds: number) => {
      try {
        el.currentTime = Math.max(0, seconds);
      } catch (err) {
        console.warn('Archive seek error:', err);
      }
    },
    setVolume: (vol: number) => {
      if (vol <= 0) {
        el.muted = true;
        el.volume = 0;
      } else {
        el.muted = false;
        // Apply perceptual loudness curve so even lower fader settings sound punchy and loud
        const normalized = Math.max(0, vol) / 100;
        const boosted = Math.min(1, Math.pow(normalized, 0.5));
        el.volume = Math.max(0.05, Math.min(1.0, boosted));
      }
    },
    setPlaybackRate: (rate: number) => {
      const clamped = Math.max(0.25, Math.min(3.0, rate));
      el.playbackRate = clamped;
    },
    getCurrentTime: () => el.currentTime || 0,
    getDuration: () => (el.duration && isFinite(el.duration) ? el.duration : 0),
    getPlayerState: () => (el.paused ? 2 : 1),
    loadVideoById: (url: string, startSec: number = 0) => {
      el.removeAttribute('crossorigin');
      el.src = url;
      el.currentTime = startSec;
      el.muted = false;
      el.play().catch(() => {});
    },
    cueVideoById: (url: string, startSec: number = 0) => {
      el.removeAttribute('crossorigin');
      el.src = url;
      el.currentTime = startSec;
      el.pause();
    },
    destroy: () => {
      el.pause();
      el.removeAttribute('src');
      el.load();
    },
    getRawPlayer: () => el,
  };

  if (handlers.onReady) {
    handlers.onReady(wrapper);
  }

  return wrapper;
}
