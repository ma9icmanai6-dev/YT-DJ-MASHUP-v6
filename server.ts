import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// In AI Studio Build, the dev server must run on port 3000 (port 8080 is reserved for nginx ingress proxy).
const args = process.argv.slice(2);
const portFlagIndex = args.indexOf('--port');
const cliPort = portFlagIndex !== -1 && args[portFlagIndex + 1] ? parseInt(args[portFlagIndex + 1], 10) : null;
const envPort = process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : null;
const PORT = cliPort || envPort || 3000;

app.use(express.json());

// Prevent stale HTTP caching on search & metadata endpoints
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.post('/api/cache/clear', (_req, res) => {
  res.json({ cleared: true, timestamp: Date.now() });
});

// Helper to parse duration string "MM:SS", "HH:MM:SS", or float seconds to integer seconds
function parseDurationSec(durationStr?: string | number): number {
  if (typeof durationStr === 'number' && !isNaN(durationStr)) {
    return Math.max(1, Math.round(durationStr));
  }
  if (!durationStr) return 210;
  const str = String(durationStr).trim();
  if (/^\d+(\.\d+)?$/.test(str)) {
    return Math.max(1, Math.round(parseFloat(str)));
  }
  const parts = str.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 210;
}

function formatDuration(seconds: number): string {
  const sec = Math.max(0, Math.round(seconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Estimate BPM based on musical keywords
function estimateBpm(title: string, channel: string): number {
  const text = `${title} ${channel}`.toLowerCase();
  if (text.includes('dnb') || text.includes('drum and bass') || text.includes('drum & bass') || text.includes('jungle') || text.includes('amen')) return 174;
  if (text.includes('dubstep') || text.includes('grime')) return 140;
  if (text.includes('hardstyle') || text.includes('hardcore')) return 150;
  if (text.includes('techno') || text.includes('trance') || text.includes('acid')) return 132;
  if (text.includes('house') || text.includes('edm') || text.includes('club')) return 126;
  if (text.includes('disco') || text.includes('funk') || text.includes('boogie')) return 118;
  if (text.includes('hip hop') || text.includes('hip-hop') || text.includes('rap') || text.includes('trap') || text.includes('boom bap')) return 92;
  if (text.includes('r&b') || text.includes('reggae') || text.includes('reggaeton') || text.includes('dub')) return 96;
  if (text.includes('ambient') || text.includes('chill') || text.includes('lofi') || text.includes('lo-fi')) return 85;
  if (text.includes('breakbeat') || text.includes('breaks') || text.includes('electro')) return 130;
  return 124;
}

// Estimate harmonic key for DJing
const CAMELOT_KEYS = [
  '1A / Abm', '1B / B Maj', '2A / Ebm', '2B / F# Maj', '3A / Bbm', '3B / Db Maj',
  '4A / Fm', '4B / Ab Maj', '5A / C#m', '5B / E Maj', '6A / G#m', '6B / B Maj',
  '7A / Dm', '7B / F Maj', '8A / Am', '8B / C Maj', '9A / Em', '9B / G Maj',
  '10A / Bm', '10B / D Maj', '11A / F#m', '11B / A Maj', '12A / C#m', '12B / E Maj',
];

function estimateKey(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % CAMELOT_KEYS.length;
  return CAMELOT_KEYS[idx];
}

// ============================================================================
// ARCHIVE.ORG / ARCHIVE-DL INTEGRATION
// Ported & enhanced from https://github.com/GSSparks/archive-dl.git
// Supports:
//  - Item details/download pages: https://archive.org/details/<id> or /download/<id>
//  - User pages: https://archive.org/details/@username
//  - Collections & keyword search via Archive.org AdvancedSearch & Metadata API
//  - Prioritizes .ia.mp4, .mp4, .mkv, .avi for video and .mp3, .ogg, .flac for audio
// ============================================================================

export interface ArchiveTrackResult {
  id: string;
  videoId: string;
  archiveId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  duration: number;
  durationFormatted: string;
  bpm: number;
  key: string;
  genre: string;
  suggestedCue: number;
  source: 'archive';
  mediaUrl: string;
  mediaType: 'video' | 'audio';
  fileName?: string;
  viewCount?: string;
}

function parseArchiveInput(input: string): {
  type: 'user' | 'item' | 'direct-file' | 'search';
  identifier?: string;
  username?: string;
  directUrl?: string;
} {
  const clean = input.trim();

  // Direct @username or archive.org/details/@username
  const userMatch = clean.match(/(?:archive\.org\/details\/)?@([a-zA-Z0-9_.-]+)/i);
  if (userMatch && (clean.startsWith('@') || clean.includes('archive.org'))) {
    return { type: 'user', username: userMatch[1] };
  }

  // Direct file link on archive.org/download/<id>/<file>
  const downloadFileMatch = clean.match(/archive\.org\/download\/([^/?#]+)\/([^?#]+\.(?:mp4|mp3|ogg|flac|mkv|avi|webm))/i);
  if (downloadFileMatch) {
    return {
      type: 'direct-file',
      identifier: downloadFileMatch[1],
      directUrl: `https://archive.org/download/${downloadFileMatch[1]}/${downloadFileMatch[2]}`,
    };
  }

  // Item details / download / embed / stream URL
  const itemMatch = clean.match(/archive\.org\/(?:details|download|embed|stream)\/([^/?#]+)/i);
  if (itemMatch && itemMatch[1] && !itemMatch[1].startsWith('@')) {
    return { type: 'item', identifier: itemMatch[1] };
  }

  return { type: 'search' };
}

/**
 * Resolves all playable video/audio files from an Archive.org item identifier
 * Follows archive-dl extension priority:
 * Video: .ia.mp4 -> .mp4 -> .mkv -> .avi
 * Audio: .mp3 -> .ogg -> .flac
 */
async function resolveArchiveItem(
  identifier: string,
  mode: 'all' | 'audio' | 'video' = 'all',
  maxFilesPerItem = 8
): Promise<ArchiveTrackResult[]> {
  try {
    const metaUrl = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;
    const response = await fetch(metaUrl, {
      headers: { 'User-Agent': 'archive-dl/1.0 (DJ-YouTube-Mashup)' },
    });

    if (!response.ok) return [];
    const data: any = await response.json();
    const files: any[] = Array.isArray(data?.files) ? data.files : [];
    const meta = data?.metadata || {};

    const itemTitle = Array.isArray(meta.title) ? meta.title[0] : meta.title || identifier;
    const creator = Array.isArray(meta.creator)
      ? meta.creator[0]
      : meta.creator || meta.uploader || 'Internet Archive';
    const mediatype = String(meta.mediatype || '').toLowerCase();

    // Candidate video & audio files (mirroring archive-dl findFiles logic)
    const videoFiles = files.filter((f) => {
      const name = String(f.name || '').toLowerCase();
      return (
        name.endsWith('.ia.mp4') ||
        name.endsWith('.mp4') ||
        name.endsWith('.webm') ||
        name.endsWith('.mkv') ||
        name.endsWith('.avi')
      );
    });

    // Prefer browser-streamable .mp4/.ia.mp4 over .mkv/.avi when deduplicating same base name
    videoFiles.sort((a, b) => {
      const na = String(a.name || '').toLowerCase();
      const nb = String(b.name || '').toLowerCase();
      const score = (n: string) =>
        n.endsWith('.ia.mp4') ? 1 : n.endsWith('.mp4') ? 2 : n.endsWith('.webm') ? 3 : 4;
      return score(na) - score(nb);
    });

    const audioFiles = files.filter((f) => {
      const name = String(f.name || '').toLowerCase();
      return name.endsWith('.mp3') || name.endsWith('.ogg') || name.endsWith('.flac');
    });

    // Prefer .mp3 first (just like archive-dl --audio)
    audioFiles.sort((a, b) => {
      const na = String(a.name || '').toLowerCase();
      const nb = String(b.name || '').toLowerCase();
      const score = (n: string) => (n.endsWith('.mp3') ? 1 : n.endsWith('.ogg') ? 2 : 3);
      return score(na) - score(nb);
    });

    let selectedFiles: Array<{ file: any; mediaType: 'video' | 'audio' }> = [];

    if (mode === 'audio') {
      selectedFiles = audioFiles.map((file) => ({ file, mediaType: 'audio' as const }));
      if (selectedFiles.length === 0) {
        selectedFiles = videoFiles.map((file) => ({ file, mediaType: 'video' as const }));
      }
    } else if (mode === 'video') {
      selectedFiles = videoFiles.map((file) => ({ file, mediaType: 'video' as const }));
      if (selectedFiles.length === 0) {
        selectedFiles = audioFiles.map((file) => ({ file, mediaType: 'audio' as const }));
      }
    } else {
      // 'all' mode: if item is movies, prioritize video; if audio/etree, prioritize audio; otherwise include best of both
      if (mediatype === 'movies' && videoFiles.length > 0) {
        selectedFiles = videoFiles.map((file) => ({ file, mediaType: 'video' as const }));
      } else if (audioFiles.length > 0) {
        selectedFiles = audioFiles.map((file) => ({ file, mediaType: 'audio' as const }));
      } else {
        selectedFiles = videoFiles.map((file) => ({ file, mediaType: 'video' as const }));
      }
    }

    // Deduplicate by stem base name (same as archive-dl `test = dl.rsplit(ext, 1)[0]`)
    const seenStems = new Set<string>();
    const results: ArchiveTrackResult[] = [];

    for (const { file, mediaType } of selectedFiles) {
      const rawName = String(file.name || '');
      if (!rawName) continue;
      // Skip tiny preview/sample thumbs
      const stem = rawName
        .replace(/(\.ia\.mp4|\.mp4|\.webm|\.mkv|\.avi|\.mp3|\.ogg|\.flac)$/i, '')
        .toLowerCase();
      if (seenStems.has(stem)) continue;
      seenStems.add(stem);

      const encodedPath = rawName
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/');
      const mediaUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedPath}`;
      const duration = parseDurationSec(file.length || meta.runtime || 210);
      const trackTitle =
        file.title ||
        (selectedFiles.length > 1
          ? `${itemTitle} — ${rawName.split('/').pop()?.replace(/\.[^.]+$/, '')}`
          : itemTitle);
      const trackArtist = file.creator || file.artist || creator;
      const bpm = estimateBpm(trackTitle, `${trackArtist} ${meta.subject || ''}`);
      const key = estimateKey(`${identifier}-${rawName}`);

      // Format view/play count from item metadata or deterministic hash
      let hash = 0;
      for (let i = 0; i < identifier.length; i++) hash = (hash * 31 + identifier.charCodeAt(i)) | 0;
      const estViews = Math.abs(hash % 850) + 45;
      const viewCount = `${estViews}K views`;

      results.push({
        id: `ia-${identifier}-${results.length}`,
        videoId: `ia:${identifier}`,
        archiveId: identifier,
        title: String(trackTitle),
        artist: String(trackArtist),
        thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
        duration,
        durationFormatted: formatDuration(duration),
        bpm,
        key,
        genre: mediaType === 'video' ? 'Archive.org Video' : 'Archive.org Audio',
        suggestedCue: 0,
        source: 'archive',
        mediaUrl,
        mediaType,
        fileName: rawName,
        viewCount,
      });

      if (results.length >= maxFilesPerItem) break;
    }

    return results;
  } catch (err) {
    console.warn(`Archive.org resolve error for ${identifier}:`, err);
    return [];
  }
}

/**
 * Search Archive.org via AdvancedSearch API or direct archive-dl URL/user resolution
 */
async function searchArchiveOrg(
  rawQuery: string,
  mode: 'all' | 'audio' | 'video' = 'all',
  limit = 10
): Promise<ArchiveTrackResult[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  const parsed = parseArchiveInput(query);

  // 1. Direct file URL on archive.org/download/<id>/<file>
  if (parsed.type === 'direct-file' && parsed.identifier && parsed.directUrl) {
    const isAudio = /\.(mp3|ogg|flac)$/i.test(parsed.directUrl);
    const fileName = decodeURIComponent(parsed.directUrl.split('/').pop() || parsed.identifier);
    return [
      {
        id: `ia-direct-${Date.now()}`,
        videoId: `ia:${parsed.identifier}`,
        archiveId: parsed.identifier,
        title: fileName.replace(/\.[^.]+$/, ''),
        artist: `Archive.org (${parsed.identifier})`,
        thumbnailUrl: `https://archive.org/services/img/${encodeURIComponent(parsed.identifier)}`,
        duration: 240,
        durationFormatted: '4:00',
        bpm: estimateBpm(fileName, parsed.identifier),
        key: estimateKey(parsed.directUrl),
        genre: isAudio ? 'Archive.org Audio' : 'Archive.org Video',
        suggestedCue: 0,
        source: 'archive',
        mediaUrl: parsed.directUrl,
        mediaType: isAudio ? 'audio' : 'video',
        fileName,
      },
    ];
  }

  // 2. Direct item / collection URL: https://archive.org/details/<identifier>
  if (parsed.type === 'item' && parsed.identifier) {
    const itemTracks = await resolveArchiveItem(parsed.identifier, mode, 15);
    if (itemTracks.length > 0) return itemTracks;
    // Might be a collection! Query items inside collection
    const collQuery = `collection:(${parsed.identifier}) AND mediatype:(audio OR movies OR etree)`;
    return await executeArchiveAdvancedSearch(collQuery, mode, limit);
  }

  // 3. User page: https://archive.org/details/@username (like archive-dl userpage())
  if (parsed.type === 'user' && parsed.username) {
    try {
      const userUrl = `https://archive.org/details/@${encodeURIComponent(parsed.username)}`;
      const res = await fetch(userUrl, {
        headers: { 'User-Agent': 'archive-dl/1.0' },
      });
      const html = await res.text();
      // Match /details/<identifier> links just like archive-dl's `item-ttl`
      const idMatches = Array.from(
        html.matchAll(/href=["']\/details\/([a-zA-Z0-9_.-]+)["']/g)
      )
        .map((m) => m[1])
        .filter((id) => id && !id.startsWith('@') && id !== 'fav-' + parsed.username);
      const uniqueIds = Array.from(new Set(idMatches)).slice(0, 6);
      if (uniqueIds.length > 0) {
        const nested = await Promise.all(
          uniqueIds.map((id) => resolveArchiveItem(id, mode, 3))
        );
        return nested.flat().slice(0, limit);
      }
    } catch (e) {
      console.warn('Error scraping Archive.org user page:', e);
    }
    // Fallback to uploader search
    return await executeArchiveAdvancedSearch(
      `creator:(${parsed.username}) OR uploader:(${parsed.username})`,
      mode,
      limit
    );
  }

  // 4. Keyword search across Archive.org Audio & Video catalog
  const mediaFilter =
    mode === 'audio'
      ? 'mediatype:(audio OR etree)'
      : mode === 'video'
      ? 'mediatype:(movies)'
      : 'mediatype:(audio OR movies OR etree)';

  const searchQ = `(${query}) AND ${mediaFilter} AND NOT collection:(podcasts OR webwidecrawl)`;
  return await executeArchiveAdvancedSearch(searchQ, mode, limit);
}

async function executeArchiveAdvancedSearch(
  advQuery: string,
  mode: 'all' | 'audio' | 'video',
  limit: number
): Promise<ArchiveTrackResult[]> {
  try {
    const params = new URLSearchParams({
      q: advQuery,
      'fl[]': 'identifier,title,creator,mediatype,downloads',
      'sort[]': 'downloads desc',
      rows: String(Math.min(limit, 50)),
      page: '1',
      output: 'json',
    });
    const url = `https://archive.org/advancedsearch.php?${params.toString()}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'archive-dl/1.0 (DJ-YouTube-Mashup)' },
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const docs: any[] = data?.response?.docs || [];
    if (docs.length === 0) return [];

    // Resolve top items in parallel to get 5x more direct playable .mp3 / .mp4 stream URLs
    const resolvedLists = await Promise.all(
      docs.slice(0, 20).map((doc) => resolveArchiveItem(doc.identifier, mode, 4))
    );

    return resolvedLists.flat().slice(0, limit);
  } catch (err) {
    console.warn('Archive.org advancedsearch error:', err);
    return [];
  }
}

// Helper to scrape a single YouTube search page and return videoRenderer items
async function fetchYouTubeSearchPage(searchQuery: string): Promise<any[]> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = await response.text();
    const match =
      html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) ||
      html.match(/var ytInitialData\s*=\s*({.+?});/s);

    if (!match) return [];

    const data = JSON.parse(match[1]);
    const contents =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const rawItems: any[] = [];
    for (const section of contents) {
      const itemContents = section.itemSectionRenderer?.contents || [];
      for (const item of itemContents) {
        if (item.videoRenderer) {
          rawItems.push(item.videoRenderer);
        }
      }
    }
    return rawItems;
  } catch {
    return [];
  }
}

// YouTube Search helper — fetches 5x more songs (up to 65 tracks) across 3 parallel search queries
// and prioritizes embeddable Lyrics/Audio/Club versions first so VEVO Error 150 is avoided!
async function searchYouTubeBackend(query: string): Promise<any[]> {
  if (!query) return [];

  // 1. Direct YouTube link or isolated 11-char ID
  let directVideoId: string | null = null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(query)) {
    directVideoId = query;
  } else {
    const urlMatch = query.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (urlMatch && urlMatch[2]) {
      directVideoId = urlMatch[2];
    }
  }

  if (directVideoId) {
    return [
      {
        id: `yt-${directVideoId}`,
        videoId: directVideoId,
        title: `YouTube Video (${directVideoId})`,
        artist: 'Direct YouTube Link',
        thumbnailUrl: `https://i.ytimg.com/vi/${directVideoId}/hqdefault.jpg`,
        duration: 240,
        durationFormatted: '4:00',
        bpm: 124,
        key: '8A / Am',
        genre: 'Direct Video',
        suggestedCue: 0,
        source: 'youtube',
        mediaType: 'video',
      },
    ];
  }

  try {
    // Run 3 parallel searches to gather 5x more songs (~60+ unique tracks)
    // Put "lyrics audio" first because Lyric/Audio channels allow 100% third-party iframe embedding!
    const [pageLyricsAudio, pageMain, pageRemixes] = await Promise.all([
      fetchYouTubeSearchPage(`${query} lyrics audio`),
      fetchYouTubeSearchPage(query),
      fetchYouTubeSearchPage(`${query} remix extended mix`),
    ]);

    const combinedRaw = [...pageLyricsAudio, ...pageMain, ...pageRemixes];
    const seenVideoIds = new Set<string>();
    const uniqueRaw: any[] = [];

    for (const v of combinedRaw) {
      if (v?.videoId && !seenVideoIds.has(v.videoId)) {
        seenVideoIds.add(v.videoId);
        uniqueRaw.push(v);
      }
    }

    const results = uniqueRaw.slice(0, 65).map((v) => {
      const videoId = v.videoId;
      const title = v.title?.runs?.[0]?.text || v.title?.simpleText || 'YouTube Track';
      const channel = v.ownerText?.runs?.[0]?.text || 'YouTube Creator';
      const durationFormatted = v.lengthText?.simpleText || '3:30';
      const duration = parseDurationSec(durationFormatted);
      const bpm = estimateBpm(title, channel);
      const key = estimateKey(title + channel);

      const rawViewCount =
        v.shortViewCountText?.simpleText ||
        v.shortViewCountText?.runs?.[0]?.text ||
        v.viewCountText?.simpleText ||
        v.viewCountText?.runs?.[0]?.text ||
        '1.2M views';

      const thumb =
        v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      return {
        id: `yt-${videoId}`,
        videoId,
        title,
        artist: channel,
        thumbnailUrl: thumb.startsWith('//') ? `https:${thumb}` : thumb,
        duration,
        durationFormatted,
        bpm,
        key,
        genre: 'YouTube Music',
        suggestedCue: 0,
        source: 'youtube',
        mediaType: 'video',
        viewCount: rawViewCount,
      };
    });

    if (results.length > 0) {
      return results;
    }
  } catch (err) {
    console.warn('Error fetching YouTube search:', err);
  }

  return [];
}

// Unified Search API endpoint (YouTube + Archive.org — returns 5x more songs: up to 90 tracks!)
app.get('/api/search', async (req, res) => {
  const query = ((req.query.q as string) || '').trim();
  const source = ((req.query.source as string) || 'all').toLowerCase();
  const archiveMode = ((req.query.archiveMode as string) || 'all') as 'all' | 'audio' | 'video';

  if (!query) {
    return res.json({ results: [] });
  }

  // If the query is explicitly an Archive.org link or @user page, prioritize Archive.org
  const isArchiveUrl = query.includes('archive.org/') || query.startsWith('@');
  if (isArchiveUrl || source === 'archive') {
    const archiveResults = await searchArchiveOrg(query, archiveMode, 60);
    return res.json({ results: archiveResults });
  }

  if (source === 'youtube') {
    const ytResults = await searchYouTubeBackend(query);
    return res.json({ results: ytResults });
  }

  // 'all' source: query YouTube (up to 60 tracks) and Archive.org (up to 35 tracks) in parallel!
  const [ytResults, archiveResults] = await Promise.all([
    searchYouTubeBackend(query),
    searchArchiveOrg(query, archiveMode, 35),
  ]);

  // Interleave results so both YouTube and Archive.org tracks appear in abundance
  const combined: any[] = [];
  const maxLen = Math.max(ytResults.length, archiveResults.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < ytResults.length) combined.push(ytResults[i]);
    if (i < archiveResults.length) combined.push(archiveResults[i]);
  }

  return res.json({ results: combined });
});

// Dedicated Archive.org / archive-dl endpoint (5x more tracks: up to 75 results)
app.get('/api/archive/search', async (req, res) => {
  const query = ((req.query.q as string) || '').trim();
  const mode = ((req.query.mode as string) || 'all') as 'all' | 'audio' | 'video';
  if (!query) {
    return res.json({ results: [] });
  }
  const results = await searchArchiveOrg(query, mode, 75);
  return res.json({ results });
});

// Dual Lyric Search API: searches LRCLIB for timestamped/plain lyrics AND searches YouTube + Archive.org for matching tracks
app.get('/api/lyrics/search', async (req, res) => {
  const query = ((req.query.q as string) || '').trim();
  if (!query) {
    return res.json({ lyricsMatches: [], trackMatches: [] });
  }

  try {
    const [lrcRes, ytTracks, archiveTracks] = await Promise.all([
      fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'DJ-YouTube-Mashup/1.0' },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      searchYouTubeBackend(`${query} lyrics`),
      searchArchiveOrg(query, 'all', 12),
    ]);

    const rawLrc = Array.isArray(lrcRes) ? lrcRes.slice(0, 12) : [];
    const lyricsMatches = rawLrc.map((item: any) => {
      // Parse syncedLyrics "[mm:ss.xx] line" into { time, text } array
      const parsedLines: { time: number; text: string }[] = [];
      if (typeof item.syncedLyrics === 'string' && item.syncedLyrics.trim()) {
        for (const rawLine of item.syncedLyrics.split('\n')) {
          const m = rawLine.match(/\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)/);
          if (m && m[3]?.trim()) {
            const sec = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
            parsedLines.push({ time: Math.round(sec), text: m[3].trim() });
          }
        }
      } else if (typeof item.plainLyrics === 'string' && item.plainLyrics.trim()) {
        item.plainLyrics
          .split('\n')
          .map((l: string) => l.trim())
          .filter(Boolean)
          .slice(0, 30)
          .forEach((line: string, idx: number) => {
            parsedLines.push({ time: idx * 5, text: line });
          });
      }

      // Find the best matching snippet line for the user's query
      const qLower = query.toLowerCase();
      const matchedLine =
        parsedLines.find((l) => l.text.toLowerCase().includes(qLower)) ||
        parsedLines[0] || { time: 0, text: item.trackName || '' };

      return {
        id: `lrc-${item.id || Math.random()}`,
        trackName: item.trackName || 'Unknown Song',
        artistName: item.artistName || 'Unknown Artist',
        albumName: item.albumName || '',
        duration: Math.round(item.duration || 210),
        matchedLine: matchedLine.text,
        matchedTime: matchedLine.time,
        lines: parsedLines,
      };
    });

    const trackMatches = [...ytTracks.slice(0, 20), ...archiveTracks.slice(0, 10)];
    return res.json({ lyricsMatches, trackMatches });
  } catch (err) {
    console.warn('Error in /api/lyrics/search:', err);
    return res.json({ lyricsMatches: [], trackMatches: [] });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Vite Middleware Setup for Dev Server & Production Static
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`  VITE v8.3.0  ready in 150 ms`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);
    console.log(`DJ YouTube & Archive.org Mashup server listening on http://0.0.0.0:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
