import React, { useState, useEffect } from 'react';
import { DeckTrack, MashupPreset } from '../types/dj';
import { MASHUP_PRESETS, POPULAR_TRACKS } from '../data/presets';
import { extractYouTubeId } from '../services/youtube';
import {
  searchYouTubeClient,
  SearchSource,
  ArchiveMediaMode,
} from '../services/youtubeSearch';
import {
  X,
  Search,
  Sparkles,
  Disc,
  Plus,
  Music,
  Archive,
  Download,
  FileText,
  Film,
  Loader2,
  Youtube,
  FolderUp,
} from 'lucide-react';
import { loadLocalFileAsTrack } from '../services/localTrackLoader';

interface CrateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTrackToDeck: (deckId: 'A' | 'B', track: DeckTrack) => void;
  onLoadMashupPreset: (preset: MashupPreset) => void;
  onAddCustomTrack: (track: DeckTrack) => void;
  customTracks: DeckTrack[];
  resetTrigger?: number;
}

export const CrateModal: React.FC<CrateModalProps> = ({
  isOpen,
  onClose,
  onLoadTrackToDeck,
  onLoadMashupPreset,
  onAddCustomTrack,
  customTracks,
  resetTrigger = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'tracks' | 'archive' | 'custom'>('presets');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<SearchSource>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [liveResults, setLiveResults] = useState<DeckTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Archive.org (archive-dl) tab states
  const [archiveQuery, setArchiveQuery] = useState('');
  const [archiveMode, setArchiveMode] = useState<ArchiveMediaMode>('all');
  const [archiveResults, setArchiveResults] = useState<DeckTrack[]>([]);
  const [isSearchingArchive, setIsSearchingArchive] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');

  // Custom YouTube / Archive.org input states
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [customBpm, setCustomBpm] = useState<number>(124);
  const [customKey, setCustomKey] = useState('8A / Am');
  const [customError, setCustomError] = useState<string | null>(null);

  // Clear all song searches and results on load & whenever a song/preset loads
  useEffect(() => {
    setSearchQuery('');
    setLiveResults([]);
    setIsSearching(false);
    setArchiveQuery('');
    setArchiveResults([]);
    setIsSearchingArchive(false);
    setBatchUrls('');
    setCustomUrl('');
    setCustomTitle('');
    setCustomArtist('');
    setCustomError(null);
  }, [resetTrigger]);

  // Debounced search in Track Crate Library tab (YouTube + Archive.org)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setLiveResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchYouTubeClient(
          searchQuery.trim(),
          customTracks,
          searchSource,
          'all'
        );
        setLiveResults(results);
      } catch {
        setLiveResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, searchSource, customTracks]);

  if (!isOpen) return null;

  const allTracks = [...POPULAR_TRACKS, ...customTracks];

  const genres = [
    'all',
    'House / French Touch',
    'Nu-Disco / Pop',
    'Funk / Disco',
    'Synthwave / Pop',
    'Hip Hop',
    'Pop Punk',
    'Lo-Fi Instrumental',
    'Archive.org Audio',
    'Archive.org Video',
  ];

  const filteredTracks = allTracks.filter((track) => {
    const matchesSearch =
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre =
      selectedGenre === 'all' ||
      track.genre?.toLowerCase().includes(selectedGenre.toLowerCase());
    return matchesSearch && matchesGenre;
  });

  // Execute Archive.org (archive-dl) search or batch URL extraction
  const handleRunArchiveDl = async (overrideQuery?: string) => {
    const targetQ = (overrideQuery ?? archiveQuery).trim();
    if (!batchMode && !targetQ) return;

    setIsSearchingArchive(true);
    try {
      if (batchMode) {
        const lines = batchUrls
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length === 0) {
          setIsSearchingArchive(false);
          return;
        }
        const lists = await Promise.all(
          lines.slice(0, 8).map(async (line) => {
            const res = await fetch(
              `/api/archive/search?q=${encodeURIComponent(line)}&mode=${archiveMode}`
            );
            if (res.ok) {
              const data = await res.json();
              return Array.isArray(data.results) ? data.results : [];
            }
            return [];
          })
        );
        setArchiveResults(lists.flat());
      } else {
        const res = await fetch(
          `/api/archive/search?q=${encodeURIComponent(targetQ)}&mode=${archiveMode}`
        );
        if (res.ok) {
          const data = await res.json();
          setArchiveResults(Array.isArray(data.results) ? data.results : []);
        }
      }
    } catch (e) {
      console.warn('Archive-dl search error:', e);
    } finally {
      setIsSearchingArchive(false);
    }
  };

  // Export found Archive.org URLs as video-dl.txt (archive-dl -w flag)
  const handleExportArchiveTxt = () => {
    const urls = archiveResults
      .map((r) => r.mediaUrl)
      .filter(Boolean)
      .join('\n');
    if (!urls) return;
    const blob = new Blob([urls + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = archiveMode === 'audio' ? 'audio-dl.txt' : 'video-dl.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddCustom = async (deckId?: 'A' | 'B') => {
    setCustomError(null);
    const cleanUrl = customUrl.trim();

    // Check if it's an Archive.org URL
    if (cleanUrl.includes('archive.org/')) {
      try {
        const res = await fetch(`/api/archive/search?q=${encodeURIComponent(cleanUrl)}&mode=all`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results) && data.results.length > 0) {
            const first = data.results[0];
            const newTrack: DeckTrack = {
              ...first,
              title: customTitle.trim() || first.title,
              artist: customArtist.trim() || first.artist,
              bpm: Number(customBpm) || first.bpm || 124,
              key: customKey.trim() || first.key || '8A / Am',
            };
            onAddCustomTrack(newTrack);
            if (deckId) {
              onLoadTrackToDeck(deckId, newTrack);
              onClose();
            } else {
              setCustomUrl('');
              setCustomTitle('');
              setCustomArtist('');
              setActiveTab('tracks');
            }
            return;
          }
        }
      } catch {}
    }

    const videoId = extractYouTubeId(cleanUrl);
    if (!videoId) {
      setCustomError(
        'Please enter a valid YouTube URL, 11-character video ID, or Archive.org link.'
      );
      return;
    }

    const newTrack: DeckTrack = {
      id: `custom-${Date.now()}`,
      videoId,
      title: customTitle.trim() || `YouTube Video (${videoId})`,
      artist: customArtist.trim() || 'Custom Upload',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 240,
      bpm: Number(customBpm) || 120,
      key: customKey.trim() || '8A',
      genre: 'Custom',
      suggestedCue: 0,
      source: 'youtube',
      mediaType: 'video',
    };

    onAddCustomTrack(newTrack);

    if (deckId) {
      onLoadTrackToDeck(deckId, newTrack);
      onClose();
    } else {
      setCustomUrl('');
      setCustomTitle('');
      setCustomArtist('');
      setActiveTab('tracks');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border-2 border-neutral-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <Disc className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-mono font-black text-white tracking-wide uppercase">
              DJ CRATE, YOUTUBE & ARCHIVE.ORG SELECTOR
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-300 hover:text-white bg-neutral-800 border border-neutral-700 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-neutral-950 border-b border-neutral-800 text-xs sm:text-sm font-mono shrink-0">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'presets'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>MASHUP PAIR PRESETS</span>
          </button>

          <button
            onClick={() => setActiveTab('tracks')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'tracks'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>TRACK CRATE LIBRARY</span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'archive'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-neutral-900'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>ARCHIVE.ORG (ARCHIVE-DL)</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black transition-all ${
              activeTab === 'custom'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>LOAD CUSTOM LINK</span>
          </button>
        </div>

        {/* Tab 1: Mashup Presets */}
        {activeTab === 'presets' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            <p className="text-xs sm:text-sm font-mono text-neutral-300">
              Curated iconic viral mashups. Click <strong>LOAD MASHUP PAIR</strong> to automatically calibrate Deck A & Deck B with harmonically matched BPMs, key adjustments, and recommended cue start points!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MASHUP_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-neutral-950 rounded-xl border border-neutral-800 p-4 flex flex-col justify-between gap-3 hover:border-neutral-600 transition-all shadow-lg group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-mono font-bold text-white group-hover:text-amber-300 transition-colors">
                        {preset.title}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded">
                        {preset.compatibilityScore}% HARMONIC MATCH
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-300">{preset.tagline}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs sm:text-sm font-mono">
                    <div className="bg-neutral-900 p-2.5 rounded-lg border border-cyan-500/30 flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-cyan-400 uppercase">DECK A</span>
                      <span className="text-white truncate font-bold">{preset.deckA.title}</span>
                      <span className="text-xs text-neutral-300 truncate">{preset.deckA.artist}</span>
                      <div className="text-xs text-neutral-400 mt-1 font-semibold">
                        {preset.deckA.bpm} BPM · {preset.deckA.key}
                      </div>
                    </div>

                    <div className="bg-neutral-900 p-2.5 rounded-lg border border-amber-500/30 flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-amber-400 uppercase">DECK B</span>
                      <span className="text-white truncate font-bold">{preset.deckB.title}</span>
                      <span className="text-xs text-neutral-300 truncate">{preset.deckB.artist}</span>
                      <div className="text-xs text-neutral-400 mt-1 font-semibold">
                        {preset.deckB.bpm} BPM · {preset.deckB.key}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onLoadMashupPreset(preset);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl font-mono font-black text-xs sm:text-sm uppercase bg-amber-500 hover:bg-amber-400 text-black transition-colors active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>LOAD MASHUP PAIR (A + B)</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Track Crate Library (YouTube + Archive.org Unified Search) */}
        {activeTab === 'tracks' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {/* Search, Source Filter & Genre Filter */}
            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-300" />
                <input
                  type="text"
                  placeholder="Search YouTube & Archive.org by title, artist, or paste URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 border-2 border-neutral-700 rounded-xl text-sm sm:text-base font-mono font-bold text-white placeholder-neutral-400 focus:outline-none focus:border-cyan-400"
                />
                {isSearching && (
                  <Loader2 className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-400 animate-spin" />
                )}
              </div>

              {/* Source Filter */}
              <div className="flex items-center gap-1.5 bg-neutral-950 border-2 border-neutral-800 rounded-xl p-1.5 text-xs sm:text-sm font-mono shrink-0">
                <button
                  onClick={() => setSearchSource('all')}
                  className={`px-3 py-1.5 rounded-lg font-black transition-colors ${
                    searchSource === 'all'
                      ? 'bg-amber-500 text-black'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setSearchSource('youtube')}
                  className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 transition-colors ${
                    searchSource === 'youtube'
                      ? 'bg-red-500 text-white'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  <Youtube className="w-4 h-4" />
                  <span>YT</span>
                </button>
                <button
                  onClick={() => setSearchSource('archive')}
                  className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 transition-colors ${
                    searchSource === 'archive'
                      ? 'bg-emerald-500 text-black'
                      : 'text-emerald-400 hover:text-white'
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  <span>ARCHIVE.ORG</span>
                </button>
              </div>

              {/* Genre Filter */}
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="px-3.5 py-2.5 bg-neutral-950 border-2 border-neutral-800 rounded-xl text-xs sm:text-sm font-mono font-bold text-neutral-200 focus:outline-none focus:border-cyan-400"
              >
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g === 'all' ? 'All Genres' : g}
                  </option>
                ))}
              </select>
            </div>

            {/* Track List */}
            <div className="space-y-3">
              {liveResults.length > 0 && (
                <div className="space-y-3 mb-4 pb-4 border-b-2 border-neutral-800">
                  <div className="text-sm sm:text-base font-mono uppercase tracking-wider text-amber-300 font-black px-3.5 py-2 bg-neutral-950 rounded-xl border border-amber-500/40 flex items-center justify-between">
                    <span>
                      Live Search Results (
                      {searchSource === 'archive'
                        ? 'Archive.org / archive-dl'
                        : searchSource === 'youtube'
                        ? 'YouTube'
                        : 'YouTube + Archive.org'}
                      )
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-amber-500 text-black font-black text-xs sm:text-sm">
                      {liveResults.length} SONGS
                    </span>
                  </div>
                  {liveResults.map((track) => {
                    const isArchive = track.source === 'archive';
                    return (
                      <div
                        key={track.id}
                        className={`shrink-0 bg-neutral-950 rounded-2xl border-2 p-3.5 sm:p-4 flex items-center justify-between gap-4 transition-colors shadow-lg ${
                          isArchive
                            ? 'border-emerald-500/50 hover:border-emerald-400'
                            : 'border-amber-500/50 hover:border-amber-400'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <img
                            src={track.thumbnailUrl}
                            alt={track.title}
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-neutral-700 shrink-0 bg-neutral-900 shadow-md"
                          />
                          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                            <h4 className="text-base sm:text-lg md:text-xl font-extrabold text-white leading-snug line-clamp-2">
                              {track.title}
                            </h4>
                            <p className="text-sm sm:text-base font-bold text-neutral-200 truncate">
                              {track.artist}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono text-neutral-200 mt-1">
                              {isArchive ? (
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-400/70 font-black">
                                  ARCHIVE.ORG ({track.mediaType === 'audio' ? 'MP3' : 'MP4'})
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-red-950 text-red-200 border border-red-400/70 font-black">
                                  YOUTUBE
                                </span>
                              )}
                              <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-200 border border-amber-400/60 font-black">
                                {track.bpm} BPM
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white border border-neutral-600 font-bold">
                                {track.key}
                              </span>
                              {track.durationFormatted && (
                                <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-200 border border-neutral-700 font-bold">
                                  {track.durationFormatted}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {isArchive && track.mediaUrl && (
                            <a
                              href={track.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="px-3.5 py-3 rounded-xl text-xs sm:text-sm font-mono font-bold bg-neutral-900 hover:bg-emerald-950 text-emerald-300 border-2 border-emerald-500/50 flex items-center gap-1.5 transition-colors"
                              title="Download media file via archive-dl"
                            >
                              <Download className="w-5 h-5" />
                              <span className="hidden sm:inline">DL</span>
                            </a>
                          )}
                          <button
                            onClick={() => {
                              onLoadTrackToDeck('A', track);
                              onClose();
                            }}
                            className="px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-mono font-black uppercase bg-cyan-400 text-black border-2 border-cyan-200 hover:bg-cyan-300 active:scale-95 transition-all shadow-md"
                          >
                            + DECK A
                          </button>
                          <button
                            onClick={() => {
                              onLoadTrackToDeck('B', track);
                              onClose();
                            }}
                            className="px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-mono font-black uppercase bg-amber-400 text-black border-2 border-amber-200 hover:bg-amber-300 active:scale-95 transition-all shadow-md"
                          >
                            + DECK B
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredTracks.map((track) => (
                <div
                  key={track.id}
                  className="shrink-0 bg-neutral-950 rounded-2xl border-2 border-neutral-800 p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:border-neutral-600 transition-colors shadow-md"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-neutral-700 shrink-0 shadow-md"
                    />
                    <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                      <h4 className="text-base sm:text-lg md:text-xl font-extrabold text-white leading-snug line-clamp-2">
                        {track.title}
                      </h4>
                      <p className="text-sm sm:text-base font-bold text-neutral-200 truncate">
                        {track.artist}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono text-neutral-200 mt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-200 border border-cyan-400/60 font-black">
                          {track.bpm} BPM
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-200 border border-amber-400/60 font-black">
                          {track.key}
                        </span>
                        {track.genre && (
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-200 border border-neutral-700 font-bold">
                            {track.genre}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => {
                        onLoadTrackToDeck('A', track);
                        onClose();
                      }}
                      className="px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-mono font-black uppercase bg-cyan-400 text-black border-2 border-cyan-200 hover:bg-cyan-300 active:scale-95 transition-all shadow-md"
                      title="Load track to Deck A"
                    >
                      + DECK A
                    </button>

                    <button
                      onClick={() => {
                        onLoadTrackToDeck('B', track);
                        onClose();
                      }}
                      className="px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-mono font-black uppercase bg-amber-400 text-black border-2 border-amber-200 hover:bg-amber-300 active:scale-95 transition-all shadow-md"
                      title="Load track to Deck B"
                    >
                      + DECK B
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Dedicated Archive.org (archive-dl) Browser & Downloader */}
        {activeTab === 'archive' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            <div className="bg-neutral-950 border-2 border-emerald-500/40 rounded-2xl p-3.5 flex flex-col gap-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-mono font-black text-white uppercase">
                    ARCHIVE-DL ENGINE · INTERNET ARCHIVE MEDIA EXTRACTOR
                  </span>
                </div>

                {/* archive-dl CLI Flags (--audio, --video, --batch, -w video-dl.txt) */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <button
                    onClick={() => setArchiveMode('all')}
                    className={`px-2.5 py-1.5 rounded-lg font-black border transition-colors ${
                      archiveMode === 'all'
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white'
                    }`}
                  >
                    ALL MEDIA
                  </button>
                  <button
                    onClick={() => setArchiveMode('video')}
                    className={`px-2.5 py-1.5 rounded-lg font-black border flex items-center gap-1.5 transition-colors ${
                      archiveMode === 'video'
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white'
                    }`}
                    title="Default archive-dl video priority: .ia.mp4, .mp4, .mkv, .avi"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>VIDEO (.mp4)</span>
                  </button>
                  <button
                    onClick={() => setArchiveMode('audio')}
                    className={`px-2.5 py-1.5 rounded-lg font-black border flex items-center gap-1.5 transition-colors ${
                      archiveMode === 'audio'
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white'
                    }`}
                    title="archive-dl --audio flag: look for .mp3, .ogg, .flac"
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>--audio (.mp3)</span>
                  </button>
                  <button
                    onClick={() => setBatchMode(!batchMode)}
                    className={`px-2.5 py-1.5 rounded-lg font-black border transition-colors ${
                      batchMode
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white'
                    }`}
                    title="archive-dl --batch flag: resolve multiple user/collection URLs"
                  >
                    --batch
                  </button>
                  {archiveResults.length > 0 && (
                    <button
                      onClick={handleExportArchiveTxt}
                      className="px-3 py-1.5 rounded-lg font-black bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5 transition-colors"
                      title="archive-dl -w flag: Export found media URLs to text file"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>-w {archiveMode === 'audio' ? 'audio-dl.txt' : 'video-dl.txt'}</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs sm:text-sm font-mono text-neutral-300">
                Search Archive.org audio/video collections or paste any{' '}
                <code className="text-emerald-300">https://archive.org/details/...</code> item, collection, or{' '}
                <code className="text-emerald-300">@username</code> page URL to extract direct{' '}
                <code className="text-emerald-300">.mp4</code> / <code className="text-emerald-300">.mp3</code> streams for Deck A & Deck B.
              </p>

              {/* Single Query/URL or --batch Textarea */}
              {!batchMode ? (
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    placeholder="Search Archive.org (e.g. 'house acapella', 'amen break', 'daft punk') or paste archive.org URL..."
                    value={archiveQuery}
                    onChange={(e) => setArchiveQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRunArchiveDl();
                    }}
                    className="flex-1 px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-700 rounded-xl text-sm sm:text-base font-mono font-bold text-white placeholder-neutral-400 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => handleRunArchiveDl()}
                    disabled={isSearchingArchive}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-black uppercase bg-emerald-500 hover:bg-emerald-400 text-black transition-colors flex items-center gap-2 shrink-0"
                  >
                    {isSearchingArchive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>SEARCH / EXTRACT</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <textarea
                    rows={3}
                    placeholder="Paste multiple Archive.org user (@username), collection, or item URLs (one per line)..."
                    value={batchUrls}
                    onChange={(e) => setBatchUrls(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-700 rounded-xl text-sm sm:text-base font-mono font-bold text-white placeholder-neutral-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => handleRunArchiveDl()}
                    disabled={isSearchingArchive}
                    className="self-end px-5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-black uppercase bg-amber-500 hover:bg-amber-400 text-black transition-colors flex items-center gap-2"
                  >
                    {isSearchingArchive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>RUN --BATCH EXTRACTOR</span>
                  </button>
                </div>
              )}

              {/* Quick Archive.org Crate Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                <span className="text-neutral-300 font-bold">QUICK CRATES:</span>
                {[
                  { label: 'Classic Breakbeats', q: 'breakbeat loops' },
                  { label: 'Vocal Acapellas', q: 'acapella vocals' },
                  { label: '90s House Mixes', q: '90s house mix' },
                  { label: 'Hip Hop Instrumentals', q: 'hip hop instrumental beats' },
                  { label: 'Retro VJ Visuals', q: 'prelinger vj loops' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setBatchMode(false);
                      setArchiveQuery(preset.q);
                      handleRunArchiveDl(preset.q);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-emerald-300 border border-neutral-700 font-semibold transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Archive.org Extracted Media Results */}
            <div className="space-y-3">
              {isSearchingArchive && (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2.5 text-sm sm:text-base font-mono font-bold text-emerald-400">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span>Querying Archive.org metadata & resolving direct .mp4 / .mp3 streams...</span>
                </div>
              )}

              {!isSearchingArchive && archiveResults.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2.5 text-sm font-mono text-neutral-400 border-2 border-dashed border-neutral-800 rounded-2xl">
                  <Archive className="w-8 h-8 text-neutral-500" />
                  <span>
                    Enter a search term, collection, or <code className="text-neutral-200">archive.org</code> URL above, or click a Quick Crate to extract streams.
                  </span>
                </div>
              )}

              {archiveResults.map((track) => (
                <div
                  key={track.id}
                  className="shrink-0 bg-neutral-950 rounded-2xl border-2 border-emerald-500/50 p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:border-emerald-400 transition-colors shadow-lg"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-neutral-700 shrink-0 bg-neutral-900 shadow-md"
                    />
                    <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                      <h4 className="text-base sm:text-lg md:text-xl font-extrabold text-white leading-snug line-clamp-2">
                        {track.title}
                      </h4>
                      <p className="text-sm sm:text-base font-bold text-neutral-200 truncate">
                        {track.artist}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono text-neutral-200 mt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-400/70 font-black">
                          {track.mediaType === 'audio' ? 'MP3 AUDIO' : 'MP4 VIDEO'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-200 border border-amber-400/60 font-black">
                          {track.bpm} BPM
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white border border-neutral-600 font-bold">
                          {track.key}
                        </span>
                        {track.durationFormatted && (
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-200 border border-neutral-700 font-bold">
                            {track.durationFormatted}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {track.mediaUrl && (
                      <a
                        href={track.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="px-3.5 py-3 rounded-xl text-xs sm:text-sm font-mono font-bold bg-neutral-900 hover:bg-emerald-950 text-emerald-300 border-2 border-emerald-500/50 flex items-center gap-1.5 transition-colors"
                        title="archive-dl -d: Download media file directly"
                      >
                        <Download className="w-5 h-5" />
                        <span className="hidden sm:inline">-d DL</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        onLoadTrackToDeck('A', track);
                        onClose();
                      }}
                      className="px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-mono font-black uppercase bg-cyan-400 text-black border-2 border-cyan-200 hover:bg-cyan-300 active:scale-95 transition-all shadow-md"
                    >
                      + DECK A
                    </button>
                    <button
                      onClick={() => {
                        onLoadTrackToDeck('B', track);
                        onClose();
                      }}
                      className="px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-mono font-black uppercase bg-amber-400 text-black border-2 border-amber-200 hover:bg-amber-300 active:scale-95 transition-all shadow-md"
                    >
                      + DECK B
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Custom YouTube / Archive.org Link Loader */}
        {activeTab === 'custom' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <p className="text-xs font-mono text-neutral-400">
              Load <em>any</em> YouTube video or Internet Archive (<code className="text-emerald-400">archive.org/details/...</code>) item directly into your DJ session:
            </p>

            <div className="flex flex-col gap-3 max-w-xl">
              <div>
                <label className="text-xs font-mono text-neutral-300 font-bold block mb-1">
                  YouTube or Archive.org URL / ID:
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or https://archive.org/details/..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-neutral-300 font-bold block mb-1">
                    Track Title (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Daft Punk - One More Time"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-300 font-bold block mb-1">
                    Artist (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Daft Punk"
                    value={customArtist}
                    onChange={(e) => setCustomArtist(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-neutral-300 font-bold block mb-1">
                    Estimated BPM:
                  </label>
                  <input
                    type="number"
                    value={customBpm}
                    onChange={(e) => setCustomBpm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-300 font-bold block mb-1">
                    Key (Camelot or Musical):
                  </label>
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="e.g. 8A / Am"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              {customError && (
                <div className="text-xs font-mono text-red-400 bg-red-950/40 border border-red-800 p-2 rounded">
                  {customError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleAddCustom('A')}
                  className="flex-1 py-2.5 rounded-lg text-xs font-mono font-bold uppercase bg-cyan-500 hover:bg-cyan-400 text-black transition-colors active:scale-95"
                >
                  Load Directly to Deck A
                </button>

                <button
                  onClick={() => handleAddCustom('B')}
                  className="flex-1 py-2.5 rounded-lg text-xs font-mono font-bold uppercase bg-amber-500 hover:bg-amber-400 text-black transition-colors active:scale-95"
                >
                  Load Directly to Deck B
                </button>

                <button
                  onClick={() => handleAddCustom()}
                  className="px-4 py-2.5 rounded-lg text-xs font-mono font-bold uppercase bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
                >
                  Save to Crate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
