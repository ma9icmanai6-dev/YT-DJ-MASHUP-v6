import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DeckTrack } from '../types/dj';
import { POPULAR_TRACKS } from '../data/presets';
import { extractYouTubeId } from '../services/youtube';
import {
  searchYouTubeClient,
  normalizeDjSearchQuery,
  extractArchiveUrlInfo,
  SearchSource,
  ArchiveMediaMode,
} from '../services/youtubeSearch';
import {
  Search,
  X,
  Youtube,
  Loader2,
  Music,
  Mic,
  Piano,
  Archive,
  Download,
  Film,
} from 'lucide-react';

interface DeckQuickSearchProps {
  deckId: 'A' | 'B';
  onLoadTrack: (track: DeckTrack) => void;
  accentColor: 'cyan' | 'orange';
  customTracks?: DeckTrack[];
  resetTrigger?: number;
}

export const DeckQuickSearch: React.FC<DeckQuickSearchProps> = ({
  deckId,
  onLoadTrack,
  accentColor,
  customTracks = [],
  resetTrigger = 0,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [liveResults, setLiveResults] = useState<DeckTrack[]>([]);
  const [searchSource, setSearchSource] = useState<SearchSource>('all');
  const [archiveMode, setArchiveMode] = useState<ArchiveMediaMode>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all song searches and results on load & whenever a song/preset loads
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setQuery('');
    setLiveResults([]);
    setIsSearching(false);
    setIsOpen(false);
  }, [resetTrigger]);

  const isCyan = accentColor === 'cyan';
  const focusBorder = isCyan ? 'focus-within:border-cyan-400' : 'focus-within:border-amber-400';
  const dropBorder = isCyan ? 'border-cyan-400/80' : 'border-amber-400/80';
  const accentText = isCyan ? 'text-cyan-300' : 'text-amber-300';
  const accentBadgeBg = isCyan
    ? 'bg-cyan-950 text-cyan-200 border-cyan-400/60'
    : 'bg-amber-950 text-amber-200 border-amber-400/60';
  const buttonBg = isCyan
    ? 'bg-cyan-500 hover:bg-cyan-400 text-black'
    : 'bg-amber-500 hover:bg-amber-400 text-black';

  // Position dropdown toward the center of the screen so it never clips off the viewport edges
  const dropdownAlignClass =
    deckId === 'A'
      ? 'right-0 lg:left-0 lg:right-auto'
      : 'right-0';

  const allTracks = useMemo(() => [...POPULAR_TRACKS, ...customTracks], [customTracks]);

  // Check if query contains a direct YouTube link or ID
  const youtubeId = useMemo(
    () => (searchSource === 'archive' ? null : extractYouTubeId(query)),
    [query, searchSource]
  );

  // Check if query is an Archive.org link or @username
  const archiveInfo = useMemo(() => extractArchiveUrlInfo(query), [query]);

  // Instant local catalog matches (only when user types a query so search starts clean on load)
  const localMatches = useMemo(() => {
    const cleanQ = normalizeDjSearchQuery(query).toLowerCase();
    if (!cleanQ) return [];

    const words = cleanQ.split(/\s+/).filter(Boolean);
    return allTracks
      .filter((track) => {
        const searchTarget = `${track.title} ${track.artist} ${track.genre || ''}`.toLowerCase();
        return words.every((word) => searchTarget.includes(word));
      })
      .slice(0, 60);
  }, [query, allTracks]);

  // Debounced unified YouTube + Archive.org search
  useEffect(() => {
    const cleanQ = query.trim();
    if (!cleanQ || youtubeId) {
      setLiveResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const normalized = normalizeDjSearchQuery(cleanQ);
        const effectiveSource: SearchSource = archiveInfo.isArchive ? 'archive' : searchSource;
        const results = await searchYouTubeClient(
          normalized,
          customTracks,
          effectiveSource,
          archiveMode
        );
        setLiveResults(results);
      } catch {
        setLiveResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, youtubeId, customTracks, searchSource, archiveMode, archiveInfo.isArchive]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectTrack = (track: DeckTrack) => {
    setQuery('');
    setLiveResults([]);
    setIsOpen(false);
    onLoadTrack(track);
  };

  const handleLoadYouTube = (vidId: string) => {
    const newTrack: DeckTrack = {
      id: `custom-yt-${Date.now()}`,
      videoId: vidId,
      title: `YouTube Video (${vidId})`,
      artist: 'Online Video',
      thumbnailUrl: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
      duration: 240,
      bpm: 124,
      key: '8A / Am',
      genre: 'Custom YouTube',
      suggestedCue: 0,
      source: 'youtube',
      mediaType: 'video',
    };
    onLoadTrack(newTrack);
    setQuery('');
    setIsOpen(false);
  };

  const handleSearchSubmit = async () => {
    if (youtubeId) {
      handleLoadYouTube(youtubeId);
      return;
    }

    const cleanQ = query.trim();
    if (!cleanQ) return;

    if (liveResults.length > 0) {
      handleSelectTrack(liveResults[0]);
      return;
    }

    setIsSearching(true);
    try {
      const normalized = normalizeDjSearchQuery(cleanQ);
      const effectiveSource: SearchSource = archiveInfo.isArchive ? 'archive' : searchSource;
      const results = await searchYouTubeClient(
        normalized,
        customTracks,
        effectiveSource,
        archiveMode
      );
      if (results.length > 0) {
        handleSelectTrack(results[0]);
        setIsSearching(false);
        return;
      }
    } catch {}

    if (localMatches.length > 0) {
      handleSelectTrack(localMatches[0]);
    }
    setIsSearching(false);
  };

  const handleAppendModifier = (modifier: string) => {
    const base = query.trim().replace(/\b(instrumental|acapella|vocals?)\b/gi, '').trim();
    const newQuery = base ? `${base} ${modifier}` : modifier;
    setQuery(newQuery);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[220px] sm:min-w-[280px] md:min-w-[340px]">
      {/* Search Input Bar with Source Indicator & clickable Go button */}
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2 bg-neutral-900 border-2 border-neutral-700 rounded-xl text-sm sm:text-base font-mono transition-all shadow-md ${focusBorder}`}
      >
        {searchSource === 'archive' || archiveInfo.isArchive ? (
          <Archive className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <Search className="w-5 h-5 text-neutral-200 shrink-0" />
        )}
        <input
          type="text"
          placeholder={
            searchSource === 'archive'
              ? 'Search Archive.org or paste URL...'
              : 'Search songs, artists, or paste URL...'
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-white placeholder-neutral-400 focus:outline-none text-sm sm:text-base font-mono py-0.5 font-bold"
        />

        {isSearching && (
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
        )}

        {query && !isSearching && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="text-neutral-300 hover:text-white p-1"
            title="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={handleSearchSubmit}
          className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-black uppercase transition-all shrink-0 shadow-md ${buttonBg}`}
          title="Search YouTube & Archive.org and Load"
        >
          GO
        </button>
      </div>

      {/* Extra-Large, High-Contrast, Easy-to-Read Dropdown Suggestions Menu */}
      {isOpen && (
        <div
          className={`absolute top-full ${dropdownAlignClass} mt-2.5 w-[calc(100vw-1.5rem)] sm:w-[620px] lg:w-[720px] xl:w-[780px] max-w-[95vw] bg-neutral-950 border-2 ${dropBorder} rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.98)] z-[100] flex flex-col overflow-hidden animate-fade-in`}
        >
          {/* Sticky Top Filter & Source Controls Header */}
          <div className="p-3 bg-neutral-900 border-b-2 border-neutral-800 flex flex-col gap-2.5 shrink-0">
            {/* Source Selector & archive-dl Flags Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-neutral-300 font-extrabold">SOURCE:</span>
                <button
                  onClick={() => setSearchSource('all')}
                  className={`px-3 py-1.5 rounded-lg font-black transition-colors ${
                    searchSource === 'all'
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'bg-neutral-800 text-neutral-200 hover:text-white'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setSearchSource('youtube')}
                  className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 transition-colors ${
                    searchSource === 'youtube'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-neutral-800 text-neutral-200 hover:text-white'
                  }`}
                >
                  <Youtube className="w-4 h-4" />
                  <span>YOUTUBE</span>
                </button>
                <button
                  onClick={() => setSearchSource('archive')}
                  className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 transition-colors ${
                    searchSource === 'archive'
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'bg-neutral-800 text-emerald-300 hover:text-white border border-emerald-500/40'
                  }`}
                  title="Search Internet Archive (archive.org / archive-dl)"
                >
                  <Archive className="w-4 h-4" />
                  <span>ARCHIVE.ORG</span>
                </button>
              </div>

              {/* archive-dl --audio / --video mode selector */}
              {(searchSource === 'archive' || searchSource === 'all') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setArchiveMode((prev) => (prev === 'audio' ? 'all' : 'audio'))
                    }
                    className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 border transition-colors ${
                      archiveMode === 'audio'
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                        : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:text-white'
                    }`}
                    title="archive-dl --audio flag: prioritize MP3/OGG audio files"
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>--audio</span>
                  </button>
                  <button
                    onClick={() =>
                      setArchiveMode((prev) => (prev === 'video' ? 'all' : 'video'))
                    }
                    className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 border transition-colors ${
                      archiveMode === 'video'
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400'
                        : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:text-white'
                    }`}
                    title="archive-dl video mode: prioritize .ia.mp4 / .mp4 video streams"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>--video</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick DJ Stem Modifier Filter Chips */}
            <div className="flex items-center justify-between gap-2 text-xs sm:text-sm font-mono pt-1 border-t border-neutral-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-neutral-300 font-extrabold shrink-0">STEMS:</span>
                <button
                  onClick={() => handleAppendModifier('instrumental')}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-300 font-bold flex items-center gap-1.5 border border-neutral-700 transition-colors"
                  title="Search for instrumental backing track"
                >
                  <Piano className="w-4 h-4" />
                  <span>+ Instrumental</span>
                </button>
                <button
                  onClick={() => handleAppendModifier('accapella')}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-bold flex items-center gap-1.5 border border-neutral-700 transition-colors"
                  title="Search for isolated vocal accapella"
                >
                  <Mic className="w-4 h-4" />
                  <span>+ Accapella</span>
                </button>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-black border border-neutral-700"
                title="Close search list"
              >
                CLOSE ✕
              </button>
            </div>
          </div>

          {/* Dedicated Scrollable Results Body (block layout with space-y-3 so cards NEVER squish!) */}
          <div className="max-h-[68vh] overflow-y-auto p-3.5 space-y-3 bg-neutral-950">
            {/* Direct YouTube Video Link Match */}
            {youtubeId && (
              <button
                onClick={() => handleLoadYouTube(youtubeId)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-red-950/60 hover:bg-red-900/70 text-left border-2 border-red-500 text-base font-mono transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Youtube className="w-8 h-8 text-red-500 shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <span className="font-extrabold text-white block truncate text-base sm:text-lg">
                      Load YouTube Video: <strong className="text-red-300">{youtubeId}</strong>
                    </span>
                    <span className="text-sm text-neutral-200">
                      Mount directly into Deck {deckId}
                    </span>
                  </div>
                </div>
                <span className="text-sm sm:text-base font-black text-black bg-red-500 px-4 py-2 rounded-xl uppercase">
                  LOAD {deckId}
                </span>
              </button>
            )}

            {/* Searching Status Indicator */}
            {isSearching && (
              <div className="p-4 text-center flex items-center justify-center gap-3 text-base font-mono font-bold text-amber-300 bg-neutral-900 rounded-xl border-2 border-amber-500/40">
                <Loader2 className="w-6 h-6 animate-spin shrink-0" />
                <span>
                  Searching{' '}
                  {searchSource === 'archive' || archiveInfo.isArchive
                    ? 'Archive.org (archive-dl)'
                    : searchSource === 'youtube'
                    ? 'YouTube'
                    : 'YouTube & Archive.org'}{' '}
                  for "{query}"...
                </span>
              </div>
            )}

            {/* Live YouTube + Archive.org Search Results Header */}
            {liveResults.length > 0 && (
              <div className="px-3.5 py-2 text-sm sm:text-base font-mono uppercase tracking-wider text-amber-300 font-black bg-neutral-900 rounded-xl border border-amber-500/40 flex items-center justify-between">
                <span>
                  {searchSource === 'archive' || archiveInfo.isArchive
                    ? 'Archive.org (archive-dl) Results'
                    : searchSource === 'youtube'
                    ? 'Live YouTube Results'
                    : 'YouTube + Archive.org Results'}
                </span>
                <span className="px-3 py-1 rounded-lg bg-amber-500 text-black font-black text-xs sm:text-sm">
                  {liveResults.length} SONGS
                </span>
              </div>
            )}

            {/* Live Search Results — EXTRA LARGE, HIGH-CONTRAST, READABLE CARDS */}
            {liveResults.map((track) => {
              const isArchive = track.source === 'archive';
              return (
                <div
                  key={track.id}
                  className="w-full shrink-0 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800/95 text-left transition-all group border-2 border-neutral-700/90 hover:border-amber-400 gap-4 shadow-lg"
                >
                  <button
                    onClick={() => handleSelectTrack(track)}
                    className="flex items-center gap-4 min-w-0 flex-1 text-left"
                  >
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-neutral-600 shrink-0 bg-neutral-950 shadow-md"
                    />
                    <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                      <div className="text-base sm:text-lg md:text-xl font-extrabold text-white leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
                        {track.title}
                      </div>
                      <div className="text-sm sm:text-base font-bold text-neutral-200 truncate">
                        {track.artist}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 font-mono">
                        {isArchive ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-400/70 font-black text-xs sm:text-sm">
                            ARCHIVE.ORG ({track.mediaType === 'audio' ? 'MP3' : 'MP4'})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-red-950 text-red-200 border border-red-400/70 font-black text-xs sm:text-sm">
                            YOUTUBE
                          </span>
                        )}
                        <span className={`px-2.5 py-1 rounded-lg border font-black text-xs sm:text-sm ${accentBadgeBg}`}>
                          {track.bpm} BPM
                        </span>
                        {track.key && (
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-950 text-white border border-neutral-600 font-bold text-xs sm:text-sm">
                            {track.key}
                          </span>
                        )}
                        {track.durationFormatted && (
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-950 text-neutral-200 border border-neutral-700 font-bold text-xs sm:text-sm">
                            {track.durationFormatted}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {isArchive && track.mediaUrl && (
                      <a
                        href={track.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-3 rounded-xl bg-neutral-950 hover:bg-emerald-950 text-emerald-300 border-2 border-emerald-500/50 transition-colors"
                        title="Download direct file from Archive.org (archive-dl)"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleSelectTrack(track)}
                      className={`text-sm sm:text-base font-mono font-black uppercase px-4 sm:px-5 py-3 rounded-xl border-2 shrink-0 transition-all active:scale-95 shadow-lg ${
                        isCyan
                          ? 'bg-cyan-400 text-black border-cyan-200 hover:bg-cyan-300'
                          : 'bg-amber-400 text-black border-amber-200 hover:bg-amber-300'
                      }`}
                    >
                      LOAD {deckId}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pre-saved DJ Crate Library Matches */}
            {localMatches.length > 0 && (
              <>
                <div className="px-3.5 py-2 text-sm sm:text-base font-mono uppercase tracking-wider text-white font-black bg-neutral-900 rounded-xl border border-neutral-700 flex items-center justify-between mt-2">
                  <span>DJ Crate Library ({localMatches.length} Songs Ready)</span>
                  <span className={`text-xs sm:text-sm font-black ${accentText}`}>INSTANT LOAD</span>
                </div>
                {localMatches.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleSelectTrack(track)}
                    className="w-full shrink-0 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800/95 text-left transition-all group border-2 border-neutral-700/90 hover:border-cyan-400 gap-4 shadow-lg"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <img
                        src={track.thumbnailUrl}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-neutral-600 shrink-0 bg-neutral-950 shadow-md"
                      />
                      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                        <div className="text-base sm:text-lg md:text-xl font-extrabold text-white leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
                          {track.title}
                        </div>
                        <div className="text-sm sm:text-base font-bold text-neutral-200 truncate">
                          {track.artist}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 font-mono">
                          <span className={`px-2.5 py-1 rounded-lg border font-black text-xs sm:text-sm ${accentBadgeBg}`}>
                            {track.bpm} BPM
                          </span>
                          {track.key && (
                            <span className="px-2.5 py-1 rounded-lg bg-neutral-950 text-white border border-neutral-600 font-bold text-xs sm:text-sm">
                              {track.key}
                            </span>
                          )}
                          {track.genre && (
                            <span className="px-2.5 py-1 rounded-lg bg-neutral-950 text-neutral-200 border border-neutral-700 font-bold text-xs sm:text-sm">
                              {track.genre}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-sm sm:text-base font-mono font-black uppercase px-4 sm:px-5 py-3 rounded-xl border-2 shrink-0 transition-all shadow-lg ${
                        isCyan
                          ? 'bg-cyan-400 text-black border-cyan-200 group-hover:bg-cyan-300'
                          : 'bg-amber-400 text-black border-amber-200 group-hover:bg-amber-300'
                      }`}
                    >
                      LOAD {deckId}
                    </span>
                  </button>
                ))}
              </>
            )}

            {!isSearching && liveResults.length === 0 && localMatches.length === 0 && !youtubeId && (
              <div className="p-6 text-center flex flex-col items-center gap-3 text-sm sm:text-base font-mono text-neutral-200">
                <Music className="w-8 h-8 text-neutral-400" />
                <span>
                  Press ENTER or click GO to pull "{query}" from{' '}
                  {searchSource === 'archive' ? 'Archive.org' : 'YouTube & Archive.org'}.
                </span>
                <button
                  onClick={handleSearchSubmit}
                  className="px-5 py-2.5 rounded-xl text-sm sm:text-base font-black bg-amber-500 hover:bg-amber-400 text-black uppercase shadow-lg"
                >
                  Search & Mount onto Deck {deckId}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
