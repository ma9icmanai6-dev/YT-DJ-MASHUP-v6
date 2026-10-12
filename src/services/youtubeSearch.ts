import { DeckTrack } from '../types/dj';
import { POPULAR_TRACKS } from '../data/presets';
import { extractYouTubeId } from './youtube';

export interface SearchResult extends DeckTrack {
  durationFormatted?: string;
}

export type SearchSource = 'all' | 'youtube' | 'archive';
export type ArchiveMediaMode = 'all' | 'audio' | 'video';

/**
 * Normalizes common DJ search terms and typos
 */
export function normalizeDjSearchQuery(rawQuery: string): string {
  let q = rawQuery.trim();
  // Don't mutate URLs
  if (q.includes('http://') || q.includes('https://') || q.includes('archive.org') || q.startsWith('@')) {
    return q;
  }
  q = q.replace(/\b(insturmntal|instumental|instrumntal|instru)\b/gi, 'instrumental');
  q = q.replace(/\b(accapella|acappella|acapela|acapell|vocals?)\b/gi, 'acapella');
  return q;
}

/**
 * Extracts Archive.org identifier if query is an archive.org URL or @username
 */
export function extractArchiveUrlInfo(input: string): {
  isArchive: boolean;
  identifier?: string;
  directMediaUrl?: string;
} {
  const clean = input.trim();
  if (!clean) return { isArchive: false };

  const directMatch = clean.match(
    /archive\.org\/download\/([^/?#]+)\/([^?#]+\.(?:mp4|mp3|ogg|flac|mkv|avi|webm))/i
  );
  if (directMatch) {
    return {
      isArchive: true,
      identifier: directMatch[1],
      directMediaUrl: `https://archive.org/download/${directMatch[1]}/${directMatch[2]}`,
    };
  }

  const itemMatch = clean.match(/archive\.org\/(?:details|download|embed|stream)\/([^/?#]+)/i);
  if (itemMatch && itemMatch[1]) {
    return { isArchive: true, identifier: itemMatch[1] };
  }

  if (clean.startsWith('@') && clean.length > 2) {
    return { isArchive: true, identifier: clean };
  }

  return { isArchive: false };
}

export async function searchYouTubeClient(
  query: string,
  customTracks: DeckTrack[] = [],
  source: SearchSource = 'all',
  archiveMode: ArchiveMediaMode = 'all'
): Promise<SearchResult[]> {
  const cleanQ = normalizeDjSearchQuery(query);
  if (!cleanQ) return [];

  // 1. Direct YouTube URL or 11-char ID check (unless explicitly searching archive only)
  if (source !== 'archive') {
    const directId = extractYouTubeId(cleanQ);
    if (directId) {
      return [
        {
          id: `yt-${directId}`,
          videoId: directId,
          title: `YouTube Video (${directId})`,
          artist: 'Direct Link',
          thumbnailUrl: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
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
  }

  // 2. Query our unified YouTube + Archive.org backend endpoint
  try {
    const params = new URLSearchParams({
      q: cleanQ,
      source,
      archiveMode,
    });
    const res = await fetch(`/api/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (e) {
    console.warn('Backend search error, falling back to local library:', e);
  }

  // 3. Fallback: Local library matching
  const allLibrary = [...POPULAR_TRACKS, ...customTracks];
  const words = cleanQ.toLowerCase().split(/\s+/).filter(Boolean);

  const matches = allLibrary.filter((track) => {
    const haystack = `${track.title} ${track.artist} ${track.genre || ''}`.toLowerCase();
    return words.some((word) => haystack.includes(word));
  });

  if (matches.length > 0) {
    return matches.map((t) => ({
      ...t,
      durationFormatted: `${Math.floor(t.duration / 60)}:${(t.duration % 60).toString().padStart(2, '0')}`,
    }));
  }

  return [];
}
