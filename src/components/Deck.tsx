import React from 'react';
import { DeckState, DeckTrack } from '../types/dj';
import { TurntableJogWheel } from './TurntableJogWheel';
import { DeckEQ } from './DeckEQ';
import { DeckPitchBpm } from './DeckPitchBpm';
import { HotCues } from './HotCues';
import { BeatLoop } from './BeatLoop';
import { WaveformScrubber } from './WaveformScrubber';
import { DeckQuickSearch } from './DeckQuickSearch';
import { SlidingTitle } from './SlidingTitle';
import { DeckTopFxBar } from './DeckTopFxBar';
import { Play, Pause, Disc3, FolderOpen } from 'lucide-react';

interface DeckProps {
  state: DeckState;
  oppositeDeckTrack: DeckTrack | null;
  oppositeEffectiveBpm?: number;
  onPlayPause: () => void;
  onCue: () => void;
  onSeek: (seconds: number) => void;
  onScratch: (deltaSec: number) => void;
  onNudge: (dir: 1 | -1) => void;
  onChangePitch: (val: number) => void;
  onSetPitchRange: (range: 8 | 16 | 50) => void;
  onToggleKeyLock: () => void;
  onSyncBpm: () => void;
  onTapBpm: () => void;
  onChangeEQ: (band: 'high' | 'mid' | 'low', val: number) => void;
  onToggleKill: (band: 'high' | 'mid' | 'low') => void;
  onChangeFilter: (val: number) => void;
  onChangeGain?: (gainDb: number) => void;
  onChangeVolume?: (vol: number) => void;
  onTriggerCue: (id: number) => void;
  onDeleteCue: (id: number) => void;
  onSetLoop: (beats: number) => void;
  onToggleLoop: () => void;
  onHalveLoop: () => void;
  onDoubleLoop: () => void;
  onOpenCrateModal: () => void;
  onLoadTrack: (track: DeckTrack) => void;
  customTracks?: DeckTrack[];
  showVideo: boolean;
}

export const Deck: React.FC<DeckProps> = ({
  state,
  oppositeEffectiveBpm,
  onPlayPause,
  onCue,
  onSeek,
  onScratch,
  onNudge,
  onChangePitch,
  onSetPitchRange,
  onToggleKeyLock,
  onSyncBpm,
  onTapBpm,
  onChangeEQ,
  onToggleKill,
  onChangeFilter,
  onChangeGain,
  onChangeVolume,
  onTriggerCue,
  onDeleteCue,
  onSetLoop,
  onToggleLoop,
  onHalveLoop,
  onDoubleLoop,
  onOpenCrateModal,
  onLoadTrack,
  customTracks = [],
}) => {
  const isDeckA = state.id === 'A';
  const accentColor = isDeckA ? 'cyan' : 'orange';
  const accentBorder = isDeckA ? 'border-cyan-500/40' : 'border-amber-500/40';
  const accentBadge = isDeckA
    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/40';

  // Calculate loop length in seconds based on current effective BPM
  const loopDuration = (60 / Math.max(20, state.effectiveBpm)) * state.loop.lengthBeats;

  // Refs for the bottom-layer background video under each deck
  const archiveBgVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const lastSyncedTimeRef = React.useRef<number>(0);

  const isArchiveTrack = state.track?.source === 'archive' || Boolean(state.track?.videoId?.startsWith('ia:'));
  const youtubeVideoId = !isArchiveTrack && state.track?.videoId ? state.track.videoId : null;

  // Sync play/pause state with the bottom-layer Archive video on both decks
  React.useEffect(() => {
    if (isArchiveTrack && archiveBgVideoRef.current) {
      const vid = archiveBgVideoRef.current;
      vid.muted = true;
      if (state.isPlaying) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    }
  }, [state.isPlaying, isArchiveTrack]);

  // Sync seek / cue jumps & playback rate with the bottom-layer Archive video
  React.useEffect(() => {
    const drift = Math.abs(state.currentTime - lastSyncedTimeRef.current);
    lastSyncedTimeRef.current = state.currentTime;

    if (drift > 1.5 && isArchiveTrack && archiveBgVideoRef.current) {
      try {
        archiveBgVideoRef.current.currentTime = state.currentTime;
      } catch {}
    }
  }, [state.currentTime, isArchiveTrack]);

  React.useEffect(() => {
    const rate = Math.max(0.5, Math.min(2.0, 1 + state.pitch / 100));
    if (isArchiveTrack && archiveBgVideoRef.current) {
      try {
        archiveBgVideoRef.current.playbackRate = rate;
      } catch {}
    }
  }, [state.pitch, isArchiveTrack]);

  return (
    <div className={`flex-1 flex flex-col bg-neutral-950 rounded-2xl border-2 ${accentBorder} p-2.5 sm:p-3 shadow-2xl gap-2.5 relative group`}>
      {/* BOTTOM LAYER FULL-DECK LIVE VIDEO BACKGROUND: Plays under the entire deck on both sides */}
      <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden pointer-events-none select-none bg-black">
        {/* Base Artwork Fallback Backdrop */}
        <div className="absolute inset-0 z-0">
          {state.track?.thumbnailUrl && (
            <img
              src={state.track.thumbnailUrl}
              alt=""
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover scale-110 pointer-events-none filter contrast-125 saturate-150 transition-opacity duration-500 ${
                state.isPlaying ? 'opacity-45' : 'opacity-60 group-hover:opacity-70'
              }`}
            />
          )}
        </div>

        {/* Live YouTube Video Playing on Bottom Layer Under Deck (static src per track so it NEVER reloads or flashes!) */}
        <div
          className={`absolute inset-0 z-[1] overflow-hidden transition-opacity duration-500 ${
            youtubeVideoId ? (state.isPlaying ? 'opacity-90' : 'opacity-45') : 'opacity-0'
          }`}
        >
          {youtubeVideoId && (
            <iframe
              key={youtubeVideoId}
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&loop=1&playlist=${youtubeVideoId}&start=${state.track?.suggestedCue || 0}`}
              title={`Deck ${state.id} Background Video`}
              allow="autoplay; encrypted-media"
              className="w-[210%] h-[210%] -top-[55%] -left-[55%] absolute object-cover pointer-events-none filter contrast-125 saturate-150"
            />
          )}
        </div>

        {/* Live Archive.org Video Playing on Bottom Layer Under Deck */}
        <div
          className={`absolute inset-0 z-[2] overflow-hidden transition-opacity duration-300 ${
            isArchiveTrack && state.track?.mediaUrl && state.track?.mediaType !== 'audio'
              ? state.isPlaying
                ? 'opacity-90'
                : 'opacity-55'
              : 'opacity-0'
          }`}
        >
          <video
            ref={archiveBgVideoRef}
            src={isArchiveTrack && state.track?.mediaType !== 'audio' ? state.track?.mediaUrl : undefined}
            muted
            loop
            playsInline
            className="w-full h-full object-cover scale-110 pointer-events-none filter contrast-125 saturate-150"
          />
        </div>

        {/* Translucent Smoked Glass Overlay so the live bottom-layer video shines through clearly while keeping DJ controls crisp */}
        <div
          className={`absolute inset-0 z-[3] pointer-events-none transition-colors duration-300 ${
            state.isPlaying ? 'bg-neutral-950/35' : 'bg-neutral-950/55'
          }`}
        />

        {/* Subtle neon deck edge vignette */}
        <div
          className={`absolute inset-0 z-[4] pointer-events-none ${
            isDeckA
              ? 'bg-gradient-to-b from-cyan-950/25 via-transparent to-black/60'
              : 'bg-gradient-to-b from-amber-950/25 via-transparent to-black/60'
          }`}
        />
      </div>

      {/* Real GUI controls sit in z-10 with translucent glass styling so video underneath is visible */}
      <div className="relative z-10 flex flex-col gap-2.5 flex-1 justify-between">
        {/* Deck Header: Deck Badge & Track Info & Quick Search & Load Track */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800/80 pb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Deck Badge */}
            <div className={`px-2 py-0.5 rounded text-xs font-mono font-black tracking-widest uppercase border shrink-0 ${accentBadge}`}>
              DECK {state.id}
            </div>

            {/* Stem Role Badge (Acapella vs Instrumental) */}
            {state.track?.stemType === 'acapella' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black uppercase bg-pink-500/25 text-pink-300 border border-pink-400/60 shrink-0">
                🎤 ACAPELLA VOCALS
              </span>
            )}
            {state.track?.stemType === 'instrumental' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 shrink-0">
                🎹 INSTRUMENTAL BEAT
              </span>
            )}

            {/* Track metadata with sliding title marquee */}
            <div className="min-w-0 flex-1 pr-1">
              <SlidingTitle
                title={state.track ? state.track.title : `Deck ${state.id} Empty`}
                className="text-sm font-bold text-white leading-snug"
              />
              <div className="flex items-center gap-2 text-xs text-neutral-400 truncate mt-0.5">
                <span className="truncate">{state.track ? state.track.artist : 'Load a track to start'}</span>
                {state.track?.genre && (
                  <>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="text-neutral-500 truncate">{state.track.genre}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Controls: Search Input + Load Track Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Search Next to Load Track */}
            <DeckQuickSearch
              deckId={state.id}
              onLoadTrack={onLoadTrack}
              accentColor={accentColor}
              customTracks={customTracks}
            />

            {/* Load Track Button */}
            <button
              onClick={onOpenCrateModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-neutral-500 transition-colors shrink-0 active:scale-95 shadow-sm"
              title="Browse Mashup crates & full catalog"
            >
              <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">LOAD TRACK</span>
              <span className="sm:hidden">CRATE</span>
            </button>
          </div>
        </div>

        {/* Waveform Scrubber Timeline */}
        <WaveformScrubber
          currentTime={state.currentTime}
          duration={state.duration}
          isPlaying={state.isPlaying}
          hotCues={state.hotCues}
          loopActive={state.loop.active}
          loopStartTime={state.loop.startTime}
          loopDuration={loopDuration}
          onSeek={onSeek}
          accentColor={accentColor}
        />

        {/* Main DJ Transport: Big CDJ PLAY / CUE and Turntable Spin Record */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          {/* Left Side: Massive Pioneer-style CUE & PLAY buttons */}
          <div className="md:col-span-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {/* CUE Button */}
              <button
                onClick={onCue}
                className={`flex-1 h-16 rounded-xl flex flex-col items-center justify-center font-mono font-black text-sm tracking-wider uppercase border transition-all active:scale-95 shadow-md backdrop-blur-[1px] ${
                  isDeckA
                    ? 'bg-cyan-950/55 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/25 active:bg-cyan-500 active:text-black'
                    : 'bg-amber-950/55 text-amber-300 border-amber-500/50 hover:bg-amber-500/25 active:bg-amber-500 active:text-black'
                }`}
                title="Cue: Return to cue point and pause (Hold to preview)"
              >
                <span>CUE</span>
                <span className="text-[9px] font-normal text-neutral-300">PFL</span>
              </button>

              {/* PLAY / PAUSE Button */}
              <button
                onClick={onPlayPause}
                className={`flex-1 h-16 rounded-xl flex flex-col items-center justify-center font-mono font-black text-sm tracking-wider uppercase border transition-all active:scale-95 shadow-md backdrop-blur-[1px] ${
                  state.isPlaying
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-emerald-500/40 animate-pulse'
                    : 'bg-neutral-950/60 text-emerald-400 border-emerald-500/50 hover:bg-neutral-900/75'
                }`}
                title={state.isPlaying ? 'Pause Deck' : 'Play Deck'}
              >
                <div className="flex items-center gap-1">
                  {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{state.isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </div>
                <span className="text-[9px] font-normal opacity-80">
                  {state.isPlaying ? 'RUNNING' : 'STANDBY'}
                </span>
              </button>
            </div>
          </div>

          {/* Middle: Turntable Jog Wheel with live video playing under spinning record */}
          <div className="md:col-span-8 flex justify-center">
            <TurntableJogWheel
              deckId={state.id}
              isPlaying={state.isPlaying}
              trackTitle={state.track?.title}
              artist={state.track?.artist}
              thumbnailUrl={state.track?.thumbnailUrl}
              videoId={state.track?.videoId}
              mediaUrl={state.track?.mediaUrl}
              mediaType={state.track?.mediaType}
              effectiveBpm={state.effectiveBpm}
              onScratch={onScratch}
              onNudge={onNudge}
              accentColor={accentColor}
            />
          </div>
        </div>

        {/* Lower Performance Controls Grid: Pitch/BPM, EQ, Hot Cues, Beat Loops */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Pitch / BPM Module */}
          <DeckPitchBpm
            baseBpm={state.track ? state.track.bpm : 120}
            effectiveBpm={state.effectiveBpm}
            pitch={state.pitch}
            pitchRange={state.pitchRange}
            keyLock={state.keyLock}
            musicalKey={state.track ? state.track.key : ''}
            oppositeBpm={oppositeEffectiveBpm}
            onChangePitch={onChangePitch}
            onSetPitchRange={onSetPitchRange}
            onToggleKeyLock={onToggleKeyLock}
            onSyncBpm={onSyncBpm}
            onTapBpm={onTapBpm}
            accentColor={accentColor}
          />

          {/* 3-Band Equalizer, Filter & Preamp Boost */}
          <DeckEQ
            eq={state.eq}
            eqKill={state.eqKill}
            filter={state.filter}
            gain={state.gain}
            onChangeEQ={onChangeEQ}
            onToggleKill={onToggleKill}
            onChangeFilter={onChangeFilter}
            onChangeGain={onChangeGain}
            accentColor={accentColor}
          />
        </div>

        {/* Hot Cues & Beat Loops */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HotCues
            cues={state.hotCues}
            currentTime={state.currentTime}
            onTriggerCue={onTriggerCue}
            onDeleteCue={onDeleteCue}
            accentColor={accentColor}
          />

          <BeatLoop
            effectiveBpm={state.effectiveBpm}
            loopActive={state.loop.active}
            loopLengthBeats={state.loop.lengthBeats}
            onSetLoop={onSetLoop}
            onToggleLoop={onToggleLoop}
            onHalveLoop={onHalveLoop}
            onDoubleLoop={onDoubleLoop}
            accentColor={accentColor}
          />
        </div>
      </div>
    </div>
  );
};
