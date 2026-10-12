import React, { useState, useEffect } from 'react';
import { DeckTrack } from '../types/dj';
import { getCurrentLyricLine, TRACK_LYRICS } from '../data/lyrics';
import {
  Maximize2,
  Sparkles,
  Subtitles,
  Split,
  Edit3,
  Layers,
  Columns,
  Play,
  Pause,
  Film,
  Tv,
} from 'lucide-react';

interface TopMashupVideoStageProps {
  trackA: DeckTrack | null;
  trackB: DeckTrack | null;
  currentTimeA: number;
  currentTimeB: number;
  isPlayingA: boolean;
  isPlayingB: boolean;
  bpmA: number;
  bpmB: number;
  crossfader: number; // -1 (Deck A) to +1 (Deck B)
  onCrossfaderChange: (val: number) => void;
  loopAActive: boolean;
  loopBActive: boolean;
  displayMode?: 'dual' | 'blend' | 'audio-only';
  onChangeDisplayMode?: (mode: 'dual' | 'blend' | 'audio-only') => void;
  embedErrorA?: boolean;
  embedErrorB?: boolean;
  onPlayPauseA?: () => void;
  onPlayPauseB?: () => void;
}

export type BlendVisualMode = 'screen' | 'alpha' | 'split-wipe' | 'side-by-side';

export const TopMashupVideoStage: React.FC<TopMashupVideoStageProps> = ({
  trackA,
  trackB,
  currentTimeA,
  currentTimeB,
  isPlayingA,
  isPlayingB,
  bpmA,
  bpmB,
  crossfader,
  onCrossfaderChange,
  loopAActive,
  loopBActive,
  displayMode = 'blend',
  onChangeDisplayMode,
  embedErrorA = false,
  embedErrorB = false,
  onPlayPauseA,
  onPlayPauseB,
}) => {
  // Default to 'screen' so both videos mash together full on top of each other
  const [blendMode, setBlendMode] = useState<BlendVisualMode>('screen');
  const [showCc, setShowCc] = useState<boolean>(true);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [customLyricInput, setCustomLyricInput] = useState('');
  const [enableScanlines, setEnableScanlines] = useState(true);

  // Sync displayMode
  useEffect(() => {
    if (displayMode === 'dual') {
      setBlendMode('side-by-side');
    } else if (displayMode === 'blend' && blendMode === 'side-by-side') {
      setBlendMode('screen');
    }
  }, [displayMode]);

  const handleSelectBlendMode = (mode: BlendVisualMode) => {
    setBlendMode(mode);
    if (onChangeDisplayMode) {
      if (mode === 'side-by-side') {
        onChangeDisplayMode('dual');
      } else {
        onChangeDisplayMode('blend');
      }
    }
  };

  // Video blend calculation based on crossfader position (-1 to +1)
  const pos = (crossfader + 1) / 2; // 0 (Deck A full) to 1 (Deck B full)
  const weightA = Math.round((1 - pos) * 100);
  const weightB = Math.round(pos * 100);

  // Equal-power / boosted mashup opacities so both videos are vivid and blended when crossfader is near center
  const isStackedMashup = blendMode === 'screen' || blendMode === 'alpha' || blendMode === 'split-wipe';

  // In screen blend mode, Deck A stays bright underneath while Deck B blends on top at balanced opacity + mix-blend-mode: screen
  // so both videos are always visible through each other (even on Chromium OOPIF iframes!)
  const opacityA =
    blendMode === 'screen'
      ? crossfader <= 0
        ? 1
        : Math.max(0.45, 1 - crossfader * 0.55)
      : blendMode === 'alpha'
      ? crossfader <= 0
        ? 1
        : Math.max(0.2, 1 - crossfader * 0.8)
      : 1;

  const opacityB =
    blendMode === 'screen'
      ? Math.min(0.82, Math.max(0.12, pos * 0.96))
      : blendMode === 'alpha'
      ? Math.min(0.88, Math.max(0.1, pos * 0.95))
      : 1;

  // Additive in-process screen-projection weights for genuine hardware pixel-level mix-blend-mode: screen
  const screenGlowA = Math.max(0.15, (1 - pos * 0.65) * (isPlayingA ? 0.42 : 0.58));
  const screenGlowB = Math.max(0.15, (0.35 + pos * 0.65) * (isPlayingB ? 0.42 : 0.58));

  // Split wipe percentage (Deck B reveals from right to left based on crossfader)
  const splitPercentA = Math.max(2, Math.min(98, Math.round((1 - pos) * 100)));

  // CC Accapella Lyrics
  const lyricLineA = trackA ? getCurrentLyricLine(trackA.videoId, currentTimeA) : null;
  const lyricLineB = trackB ? getCurrentLyricLine(trackB.videoId, currentTimeB) : null;

  const toggleFullscreen = () => {
    const el = document.getElementById('top-mashup-stage');
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSaveCustomLyrics = () => {
    if (!trackA && !trackB) return;
    const targetVideoId = (trackA && trackA.videoId) || (trackB && trackB.videoId);
    if (!targetVideoId) return;

    const lines = customLyricInput.split('\n').filter(Boolean).map((line, idx) => ({
      time: idx * 4,
      text: line.trim(),
    }));

    TRACK_LYRICS[targetVideoId] = lines;
    setIsLyricsModalOpen(false);
  };

  return (
    <section
      id="top-mashup-stage"
      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 shadow-xl flex flex-col gap-1.5 relative overflow-hidden"
    >
      {/* Top Bar: Blend Mode Selector, CC Accapella Toggle & Fullscreen */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-1.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-mono font-bold text-white shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlayingA || isPlayingB ? 'bg-red-500 animate-ping' : 'bg-emerald-500'
              }`}
            />
            <span>MASHUP VIDEO SCREEN</span>
          </div>

          <span className="hidden md:inline text-[11px] font-mono text-neutral-400">
            {blendMode === 'screen'
              ? '✨ Screen Mashup Active: Dual Videos Blended (Deck A + Deck B)'
              : blendMode === 'alpha'
              ? '🌓 Alpha Cross-Dissolve: Continuous Opacity Blend'
              : blendMode === 'split-wipe'
              ? '✂️ Split-Screen Wipe: Live Crossfader Screen Slice'
              : '📺 Dual Cinema: Side-by-Side Video Monitors'}
          </span>
        </div>

        {/* Action Controls & Mode Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg text-[11px] font-mono">
            <button
              onClick={() => handleSelectBlendMode('screen')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                blendMode === 'screen'
                  ? 'bg-amber-500 text-black font-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Screen Effect: Both videos full size mashed together with additive luminous blending"
            >
              <Sparkles className="w-3 h-3" />
              <span>Screen Mashup</span>
            </button>

            <button
              onClick={() => handleSelectBlendMode('alpha')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                blendMode === 'alpha'
                  ? 'bg-cyan-500 text-black font-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Alpha Overlay: Opacity blend between both videos"
            >
              <Layers className="w-3 h-3" />
              <span>Alpha Blend</span>
            </button>

            <button
              onClick={() => handleSelectBlendMode('split-wipe')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                blendMode === 'split-wipe'
                  ? 'bg-purple-500 text-black font-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Split Wipe: Dynamic slice between videos based on crossfader"
            >
              <Columns className="w-3 h-3" />
              <span>Split Wipe</span>
            </button>

            <button
              onClick={() => handleSelectBlendMode('side-by-side')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                blendMode === 'side-by-side'
                  ? 'bg-neutral-800 text-white font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Side-by-Side Dual Cinema Monitors"
            >
              <Split className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* CRT Scanline Toggle */}
          <button
            onClick={() => setEnableScanlines(!enableScanlines)}
            className={`p-1 rounded-lg border text-xs font-mono transition-colors ${
              enableScanlines
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'
            }`}
            title="Toggle CRT VJ Scanlines & Concert Atmosphere"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>

          {/* CC for Accapella Toggle */}
          <button
            onClick={() => setShowCc(!showCc)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold border transition-all active:scale-95 shadow-sm ${
              showCc
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-emerald-500/20'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'
            }`}
            title="Toggle Closed Captions (CC) for Accapella lyrics stream"
          >
            <Subtitles className="w-3 h-3" />
            <span>CC LYRICS</span>
          </button>

          {/* Edit Lyrics / Custom CC Button */}
          <button
            onClick={() => setIsLyricsModalOpen(true)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors"
            title="Edit / Paste Custom Accapella Lyrics"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1 rounded-lg text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors"
            title="Toggle Fullscreen Stage"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ONE UNIFIED WIDESCREEN CINEMA STAGE WITH TWO VIDEOS BLENDED FULL */}
      <div
        className={`w-full relative rounded-lg overflow-hidden bg-black border border-neutral-800 shadow-inner flex items-center justify-center select-none ${
          displayMode === 'audio-only'
            ? 'h-14'
            : 'h-[195px] sm:h-[225px] lg:h-[255px] w-full'
        }`}
        style={{ isolation: 'isolate' }}
      >
        {/* Real YouTube Players Layer (Always mounted so audio continues in all modes) */}
        <div
          className={`w-full h-full relative ${
            blendMode === 'side-by-side'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1 bg-black'
              : 'relative'
          } ${displayMode === 'audio-only' ? 'opacity-20 pointer-events-none' : ''}`}
          style={{ isolation: 'isolate' }}
        >
          {/* DECK A VIDEO CONTAINER (FULL 100% WIDTH & HEIGHT IN MASHUP MODES) */}
          <div
            className={`overflow-hidden rounded-lg ${
              blendMode === 'side-by-side'
                ? 'w-full h-full relative border border-cyan-500/40 bg-black'
                : 'absolute inset-0 w-full h-full z-0 bg-black'
            }`}
            style={{
              opacity: isStackedMashup ? opacityA : 1,
              mixBlendMode: blendMode === 'screen' ? 'screen' : 'normal',
              clipPath:
                blendMode === 'split-wipe'
                  ? `polygon(0 0, ${splitPercentA}% 0, ${splitPercentA}% 100%, 0 100%)`
                  : undefined,
              pointerEvents:
                blendMode === 'side-by-side'
                  ? 'auto'
                  : isStackedMashup && pos <= 0.5
                  ? 'auto'
                  : 'none',
            }}
          >
            {/* Visual Backdrop Poster if video is loading, stopped, or audio-only Archive track */}
            <div
              className={`absolute inset-0 z-0 pointer-events-none overflow-hidden ${
                trackA?.thumbnailUrl && (embedErrorA || trackA.mediaType === 'audio')
                  ? 'opacity-100'
                  : 'opacity-0'
              }`}
            >
              {trackA?.thumbnailUrl && (
                <img
                  src={trackA.thumbnailUrl}
                  alt={trackA.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-105 filter contrast-125 saturate-150"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-cyan-950/20 to-black/50" />
            </div>

            {/* Dedicated Isolated Wrapper for YouTube Player Deck A (scaled full-bleed in widescreen mashup modes so there are zero black side-bars) */}
            <div
              className={`${
                blendMode === 'side-by-side'
                  ? 'w-full h-full relative'
                  : 'w-full h-[180%] -top-[40%] relative'
              } z-[1] ${
                embedErrorA || trackA?.source === 'archive' ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <div id="deck-a-player" className="w-full h-full" />
            </div>

            {/* Archive.org Direct HTML5 Video/Audio Stream Player for Deck A */}
            <video
              id="deck-a-archive-video"
              playsInline
              className={`w-full h-full object-cover relative z-[1] ${
                trackA?.source === 'archive' && trackA?.mediaType !== 'audio'
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none absolute inset-0'
              }`}
            />

            {/* Deck A HUD Banner */}
            <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black tracking-wider uppercase bg-black/85 border border-cyan-500/60 text-cyan-400 shadow-md">
                DECK A {isPlayingA ? '· LIVE' : '· READY'} ({weightA}%)
              </span>
              {trackA?.source === 'archive' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/90 border border-emerald-500/50 text-emerald-300">
                  ARCHIVE.ORG
                </span>
              )}
              {loopAActive && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/85 border border-purple-500/50 text-purple-300">
                  LOOP ON
                </span>
              )}
            </div>

            {/* Deck A Bottom Track Info Tag */}
            <div
              className={`absolute bottom-2 left-2 z-20 pointer-events-none flex items-center justify-between gap-2 bg-black/85 px-2.5 py-1 rounded-md border border-cyan-500/40 text-[10px] font-mono shadow-lg ${
                blendMode === 'side-by-side' ? 'right-2' : 'max-w-[46%]'
              }`}
            >
              <span className="text-cyan-300 font-bold truncate">
                A: {trackA ? `${trackA.artist} - ${trackA.title}` : 'Deck A Empty'}
              </span>
              <span className="text-cyan-400 shrink-0 font-semibold">{bpmA.toFixed(1)} BPM</span>
            </div>
          </div>

          {/* DECK B VIDEO CONTAINER (FULL 100% WIDTH & HEIGHT SUPERIMPOSED DIRECTLY WITH SCREEN EFFECT) */}
          <div
            className={`overflow-hidden rounded-lg ${
              blendMode === 'side-by-side'
                ? 'w-full h-full relative border border-amber-500/40 bg-black'
                : 'absolute inset-0 w-full h-full z-10'
            }`}
            style={{
              opacity: isStackedMashup ? opacityB : 1,
              mixBlendMode: blendMode === 'screen' ? 'screen' : 'normal',
              clipPath:
                blendMode === 'split-wipe'
                  ? `polygon(${splitPercentA}% 0, 100% 0, 100% 100%, ${splitPercentA}% 100%)`
                  : undefined,
              pointerEvents:
                blendMode === 'side-by-side'
                  ? 'auto'
                  : isStackedMashup && pos > 0.5
                  ? 'auto'
                  : 'none',
            }}
          >
            {/* Visual Backdrop Poster if video is loading, stopped, or audio-only Archive track */}
            <div
              className={`absolute inset-0 z-0 pointer-events-none overflow-hidden ${
                trackB?.thumbnailUrl && (embedErrorB || trackB.mediaType === 'audio')
                  ? 'opacity-100'
                  : 'opacity-0'
              }`}
            >
              {trackB?.thumbnailUrl && (
                <img
                  src={trackB.thumbnailUrl}
                  alt={trackB.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-105 filter contrast-125 saturate-150"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-amber-950/20 to-black/50" />
            </div>

            {/* Dedicated Isolated Wrapper for YouTube Player Deck B (scaled full-bleed in widescreen mashup modes) */}
            <div
              className={`${
                blendMode === 'side-by-side'
                  ? 'w-full h-full relative'
                  : 'w-full h-[180%] -top-[40%] relative'
              } z-[1] ${
                embedErrorB || trackB?.source === 'archive' ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <div id="deck-b-player" className="w-full h-full" />
            </div>

            {/* Archive.org Direct HTML5 Video/Audio Stream Player for Deck B */}
            <video
              id="deck-b-archive-video"
              playsInline
              className={`w-full h-full object-cover relative z-[1] ${
                trackB?.source === 'archive' && trackB?.mediaType !== 'audio'
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none absolute inset-0'
              }`}
            />

            {/* Deck B Top-Right HUD Banner */}
            <div className="absolute top-2 right-2 z-20 pointer-events-none flex items-center gap-1.5">
              {loopBActive && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/85 border border-purple-500/50 text-purple-300">
                  LOOP ON
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black tracking-wider uppercase bg-black/85 border border-amber-500/60 text-amber-400 shadow-md">
                DECK B {isPlayingB ? '· LIVE' : '· READY'} ({weightB}%)
              </span>
            </div>

            {/* Deck B Bottom-Right Track Info Tag */}
            <div
              className={`absolute bottom-2 right-2 z-20 pointer-events-none flex items-center justify-between gap-2 bg-black/85 px-2.5 py-1 rounded-md border border-amber-500/40 text-[10px] font-mono shadow-lg ${
                blendMode === 'side-by-side' ? 'left-2' : 'max-w-[46%]'
              }`}
            >
              <span className="text-amber-300 font-bold truncate">
                B: {trackB ? `${trackB.artist} - ${trackB.title}` : 'Deck B Empty'}
              </span>
              <span className="text-amber-400 shrink-0 font-semibold">{bpmB.toFixed(1)} BPM</span>
            </div>
          </div>

          {/* TRUE ADDITIVE SCREEN-BLEND LUMINOUS COMPOSITE LAYER (Guarantees pixel-level mix-blend-mode: screen in all browsers) */}
          {blendMode === 'screen' && displayMode !== 'audio-only' && (
            <div
              className="absolute inset-0 z-[15] pointer-events-none overflow-hidden"
              style={{ mixBlendMode: 'screen' }}
            >
              {trackA?.thumbnailUrl && (
                <img
                  src={trackA.thumbnailUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover scale-105 filter contrast-125 saturate-150"
                  style={{ opacity: screenGlowA, mixBlendMode: 'screen' }}
                />
              )}
              {trackB?.thumbnailUrl && (
                <img
                  src={trackB.thumbnailUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover scale-105 filter contrast-125 saturate-150"
                  style={{ opacity: screenGlowB, mixBlendMode: 'screen' }}
                />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/15 to-amber-500/20"
                style={{ mixBlendMode: 'screen' }}
              />
            </div>
          )}

          {/* Neon Split Divider Line in Split-Wipe Mode */}
          {blendMode === 'split-wipe' && (
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none w-1 bg-gradient-to-b from-cyan-400 via-white to-amber-400 shadow-[0_0_15px_rgba(255,255,255,0.9)]"
              style={{ left: `${splitPercentA}%` }}
            />
          )}
        </div>

        {/* CRT Scanline & Concert Atmosphere Overlay */}
        {enableScanlines && displayMode !== 'audio-only' && (
          <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-35 mix-blend-overlay" />
        )}

        {/* Live Mashup HUD Watermark */}
        {blendMode === 'screen' && displayMode !== 'audio-only' && (
          <div className="absolute top-2 inset-x-0 z-30 flex justify-center pointer-events-none">
            <div className="bg-black/80 px-3 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-2 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] font-mono font-black text-amber-300 tracking-wider">
                SCREEN MASHUP · {weightA}% A / {weightB}% B
              </span>
            </div>
          </div>
        )}

        {/* CC FOR ACCAPELLA: REAL-TIME KARAOKE LYRICS SUBTITLE STREAMER */}
        {showCc && displayMode !== 'audio-only' && (
          <div className="absolute bottom-9 inset-x-3 sm:inset-x-12 z-30 flex flex-col items-center justify-center pointer-events-none">
            {/* If Deck A Vocal is singing */}
            {lyricLineA && (
              <div className="w-full max-w-2xl bg-black/85 px-4 py-1 rounded-xl border border-cyan-500/50 text-center shadow-2xl mb-1 flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>VOCAL A · {trackA?.artist}</span>
                </div>
                <p className="text-xs sm:text-sm font-mono font-black text-white tracking-wide">
                  "{lyricLineA}"
                </p>
              </div>
            )}

            {/* If Deck B Vocal is singing */}
            {lyricLineB && lyricLineB !== lyricLineA && (
              <div className="w-full max-w-2xl bg-black/85 px-4 py-1 rounded-xl border border-amber-500/50 text-center shadow-2xl flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>VOCAL B · {trackB?.artist}</span>
                </div>
                <p className="text-xs sm:text-sm font-mono font-black text-white tracking-wide">
                  "{lyricLineB}"
                </p>
              </div>
            )}

            {/* Standby indicator when intro/outro or instrumental */}
            {!lyricLineA && !lyricLineB && (
              <div className="bg-black/70 px-3 py-0.5 rounded-full border border-neutral-800 text-[10px] font-mono text-neutral-300 flex items-center gap-1.5">
                <Subtitles className="w-3 h-3 text-emerald-400" />
                <span>CC Accapella Standby · Press Play on Deck A & B to Mashup</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Top Stage Mashup Crossfader & Dual Transport Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 px-0.5">
        {/* Quick Play Deck A */}
        <div className="flex items-center gap-2">
          {onPlayPauseA && (
            <button
              onClick={onPlayPauseA}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all active:scale-95 ${
                isPlayingA
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                  : 'bg-neutral-950 text-cyan-400 border-cyan-500/40 hover:bg-neutral-800'
              }`}
            >
              {isPlayingA ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>DECK A</span>
            </button>
          )}
          <span className="text-[11px] font-mono text-cyan-400 font-bold hidden sm:inline">
            {weightA}% Video Blend
          </span>
        </div>

        {/* Live Video & Audio Mashup Crossfader Slider */}
        <div className="flex-1 max-w-lg flex items-center gap-2 bg-neutral-950 border border-neutral-800 px-3 py-1 rounded-xl shadow-inner">
          <span className="text-xs font-mono font-black text-cyan-400">A</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-2 bg-neutral-800 rounded-lg"
            title="Live Video & Audio Mashup Crossfader (A to B)"
          />
          <span className="text-xs font-mono font-black text-amber-400">B</span>
          <button
            onClick={() => onCrossfaderChange(0)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border transition-all shrink-0 active:scale-95 ${
              Math.abs(crossfader) < 0.05
                ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white'
            }`}
            title="Center Crossfader (50/50 Video & Audio Screen Mashup)"
          >
            50/50 MASHUP
          </button>
        </div>

        {/* Quick Play Deck B */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-amber-400 font-bold hidden sm:inline">
            {weightB}% Video Blend
          </span>
          {onPlayPauseB && (
            <button
              onClick={onPlayPauseB}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all active:scale-95 ${
                isPlayingB
                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                  : 'bg-neutral-950 text-amber-400 border-amber-500/40 hover:bg-neutral-800'
              }`}
            >
              {isPlayingB ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>DECK B</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Lyrics / Accapella Editor Modal */}
      {isLyricsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-sm font-mono font-bold text-white uppercase">
                Custom Karaoke / CC Accapella Lyrics
              </span>
              <button
                onClick={() => setIsLyricsModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-mono text-neutral-400">
              Paste song lines below (one line per beat/bar):
            </p>
            <textarea
              rows={6}
              value={customLyricInput}
              onChange={(e) => setCustomLyricInput(e.target.value)}
              placeholder="Line 1 lyrics...&#10;Line 2 lyrics...&#10;Chorus vocals..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsLyricsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomLyrics}
                className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors"
              >
                Save Lyrics
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
