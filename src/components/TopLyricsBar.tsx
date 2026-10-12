import React, { useState } from 'react';
import { DeckTrack } from '../types/dj';
import { getLiveLyricState, LiveLyricState } from '../data/lyrics';
import { Mic, Mic2, Sparkles, ChevronUp, ChevronDown, Edit3, Music } from 'lucide-react';

interface TopLyricsBarProps {
  trackA: DeckTrack | null;
  trackB: DeckTrack | null;
  currentTimeA: number;
  currentTimeB: number;
  isPlayingA: boolean;
  isPlayingB: boolean;
  crossfader: number; // -1 to +1
  bpmA: number;
  bpmB: number;
  onOpenLyricsModal?: () => void;
}

export const TopLyricsBar: React.FC<TopLyricsBarProps> = ({
  trackA,
  trackB,
  currentTimeA,
  currentTimeB,
  isPlayingA,
  isPlayingB,
  crossfader,
  bpmA,
  bpmB,
  onOpenLyricsModal,
}) => {
  const [selectedDeck, setSelectedDeck] = useState<'auto' | 'A' | 'B' | 'duet'>('auto');
  const [isCompact, setIsCompact] = useState<boolean>(false);

  // Determine active vocal deck
  let activeTarget: 'A' | 'B' | 'duet' = 'A';
  if (selectedDeck === 'auto') {
    if (isPlayingA && isPlayingB) {
      if (trackA?.stemType === 'acapella') activeTarget = 'A';
      else if (trackB?.stemType === 'acapella') activeTarget = 'B';
      else activeTarget = crossfader <= 0 ? 'A' : 'B';
    } else if (isPlayingB) {
      activeTarget = 'B';
    } else {
      activeTarget = 'A';
    }
  } else {
    activeTarget = selectedDeck;
  }

  const lyricStateA: LiveLyricState = getLiveLyricState(trackA, currentTimeA);
  const lyricStateB: LiveLyricState = getLiveLyricState(trackB, currentTimeB);

  const primaryLyric = activeTarget === 'B' ? lyricStateB : lyricStateA;
  const secondaryLyric = activeTarget === 'B' ? lyricStateA : lyricStateB;
  const isDuet = activeTarget === 'duet' && isPlayingA && isPlayingB;

  const activeColor = activeTarget === 'B' ? 'text-amber-300' : 'text-cyan-300';
  const activeBorder = activeTarget === 'B' ? 'border-amber-500/50' : 'border-cyan-500/50';
  const activeGlow = activeTarget === 'B' ? 'shadow-amber-500/20' : 'shadow-cyan-500/20';

  return (
    <div className="w-full bg-neutral-950/95 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl relative select-none">
      {/* Background ambient concert lighting */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/20 via-purple-950/15 to-amber-950/20 pointer-events-none animate-bg-aurora" />

      {/* Top Controls & Status Bar */}
      <div className="relative z-10 px-3 py-1.5 border-b border-neutral-800/80 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Live Mic Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-xs font-mono font-black text-white shadow-sm">
            <Mic className={`w-3.5 h-3.5 ${isPlayingA || isPlayingB ? 'text-pink-400 animate-pulse' : 'text-neutral-500'}`} />
            <span className="tracking-wider uppercase text-[11px]">LIVE VOCAL TELEPROMPTER</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
          </div>

          {/* Active Song / Artist Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono">
            <span className="text-neutral-400 truncate max-w-[200px] md:max-w-xs font-semibold">
              {primaryLyric.trackTitle}
            </span>
            <span className="text-neutral-600">·</span>
            <span className={`${activeColor} font-bold truncate max-w-[150px]`}>
              {primaryLyric.artist}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-neutral-900 text-[10px] font-bold text-neutral-400 border border-neutral-800">
              {primaryLyric.section}
            </span>
          </div>
        </div>

        {/* Deck Vocal Routing Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-neutral-900/90 border border-neutral-800 rounded-lg p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setSelectedDeck('auto')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                selectedDeck === 'auto'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Automatically follow active vocal/playing deck"
            >
              AUTO
            </button>
            <button
              onClick={() => setSelectedDeck('A')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                selectedDeck === 'A'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-cyan-400/70 hover:text-cyan-300'
              }`}
              title="Track Deck A lyrics"
            >
              VOCAL A
            </button>
            <button
              onClick={() => setSelectedDeck('B')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                selectedDeck === 'B'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-amber-400/70 hover:text-amber-300'
              }`}
              title="Track Deck B lyrics"
            >
              VOCAL B
            </button>
            <button
              onClick={() => setSelectedDeck('duet')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                selectedDeck === 'duet'
                  ? 'bg-gradient-to-r from-cyan-500 to-amber-500 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Duet / Mashup simultaneous vocal display"
            >
              DUET MASHUP
            </button>
          </div>

          {onOpenLyricsModal && (
            <button
              onClick={onOpenLyricsModal}
              className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-[11px] font-mono font-bold flex items-center gap-1 transition-colors"
              title="Edit or paste custom lyrics"
            >
              <Edit3 className="w-3 h-3 text-amber-400" />
              <span className="hidden md:inline">EDIT</span>
            </button>
          )}

          <button
            onClick={() => setIsCompact(!isCompact)}
            className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
            title={isCompact ? 'Expand Live Teleprompter' : 'Collapse to compact banner'}
          >
            {isCompact ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Live Lyrics Display Stage */}
      <div className={`relative z-10 px-4 py-2 flex flex-col items-center justify-center text-center transition-all ${
        isCompact ? 'min-h-[46px]' : 'min-h-[82px]'
      }`}>
        {/* Previous Line (dimmed peekahead) */}
        {!isCompact && primaryLyric.prevLine && !isDuet && (
          <p className="text-[11px] sm:text-xs font-mono text-neutral-500 truncate max-w-2xl transition-opacity">
            {primaryLyric.prevLine}
          </p>
        )}

        {/* ACTIVE SINGING LINE (Crisp, High-Contrast Glowing Teleprompter Text) */}
        <div className="w-full max-w-4xl py-0.5 relative flex flex-col items-center">
          <div className="relative inline-block">
            <h2 className={`text-base sm:text-lg md:text-xl font-mono font-black tracking-wide leading-tight ${activeColor} drop-shadow-md`}>
              "{primaryLyric.currentLine}"
            </h2>

            {/* Karaoke Dynamic Progress Fill Overlay (Smooth sweep across line) */}
            <div
              className="absolute left-0 top-0 bottom-0 overflow-hidden pointer-events-none transition-all duration-150 ease-linear"
              style={{ width: `${Math.round(primaryLyric.progress * 100)}%` }}
            >
              <h2 className="text-base sm:text-lg md:text-xl font-mono font-black tracking-wide leading-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] whitespace-nowrap">
                "{primaryLyric.currentLine}"
              </h2>
            </div>
          </div>

          {/* Karaoke Line Beat Progress Bar */}
          <div className="w-48 sm:w-64 h-1 bg-neutral-900 rounded-full mt-1.5 overflow-hidden border border-neutral-800">
            <div
              className={`h-full transition-all duration-150 ease-linear rounded-full ${
                activeTarget === 'B'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
              }`}
              style={{ width: `${Math.round(primaryLyric.progress * 100)}%` }}
            />
          </div>
        </div>

        {/* Duet Secondary Vocal Line (When both vocals mash together) */}
        {isDuet && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/40">
              VOCAL B
            </span>
            <p className="text-xs sm:text-sm font-mono font-bold text-amber-300">
              "{secondaryLyric.currentLine}"
            </p>
          </div>
        )}

        {/* Next Line Preview (Peek ahead so DJ / singer knows what's next!) */}
        {!isCompact && primaryLyric.nextLine && !isDuet && (
          <p className="text-[11px] sm:text-xs font-mono text-neutral-400/80 truncate max-w-2xl mt-1 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">NEXT:</span>
            <span>{primaryLyric.nextLine}</span>
          </p>
        )}
      </div>
    </div>
  );
};
