import React from 'react';
import { DeckState, DeckTrack } from '../types/dj';
import { createYTBackgroundPlayer } from '../services/youtube';
import { TurntableJogWheel } from './TurntableJogWheel';
import { DeckEQ } from './DeckEQ';
import { DeckPitchBpm } from './DeckPitchBpm';
import { HotCues } from './HotCues';
import { BeatLoop } from './BeatLoop';
import { WaveformScrubber } from './WaveformScrubber';
import { DeckQuickSearch } from './DeckQuickSearch';
import { SlidingTitle } from './SlidingTitle';
import { DeckTopFxBar } from './DeckTopFxBar';
import { loadLocalFileAsTrack } from '../services/localTrackLoader';
import { Play, Pause, FolderOpen, FolderUp, Activity } from 'lucide-react';

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
  resetSearchTrigger?: number;
  onChangeNeuralMix?: (stems: import('../types/dj').NeuralMixStems) => void;
  onOpenDynaMix?: () => void;
  onOpenFaderFx?: () => void;
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
  onTriggerCue,
  onDeleteCue,
  onSetLoop,
  onToggleLoop,
  onHalveLoop,
  onDoubleLoop,
  onOpenCrateModal,
  onLoadTrack,
  customTracks = [],
  resetSearchTrigger = 0,
  onChangeNeuralMix,
  onOpenDynaMix,
  onOpenFaderFx,
}) => {
  const isDeckA = state.id === 'A';
  const accentColor = isDeckA ? 'cyan' : 'orange';
  const accentBorder = isDeckA ? 'border-cyan-500/40' : 'border-amber-500/40';
  const accentBadge = isDeckA
    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/40';

  const localFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState<boolean>(false);

  const handleLocalFile = async (file: File) => {
    try {
      const { track, dynamix } = await loadLocalFileAsTrack(file);
      (track as any).dynamix = dynamix;
      onLoadTrack(track);
    } catch (err) {
      console.error('Failed to load local file:', err);
    }
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLocalFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLocalFile(file);
    }
  };

  // Calculate loop length in seconds based on current effective BPM
  const loopDuration = (60 / Math.max(20, state.effectiveBpm)) * state.loop.lengthBeats;

  // Refs for the bottom-layer background video under each deck
  const archiveBgVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const ytBgControllerRef = React.useRef<Awaited<ReturnType<typeof createYTBackgroundPlayer>> | null>(null);
  const lastLoadedVideoIdRef = React.useRef<string | null>(null);
  const lastSyncedTimeRef = React.useRef<number>(0);

  const isArchiveTrack = state.track?.source === 'archive' || Boolean(state.track?.videoId?.startsWith('ia:'));
  const youtubeVideoId = !isArchiveTrack && state.track?.videoId ? state.track.videoId : null;
  const bgElementId = `deck-${state.id.toLowerCase()}-bg-player`;
  const fallbackBgVideoId = isDeckA ? 'XwxLwG2_Sxk' : 'hGPL5rzd3tQ';

  // Mount and control persistent YouTube background player under the deck (no iframe re-mount or flashing)
  React.useEffect(() => {
    const vidId = youtubeVideoId || fallbackBgVideoId;
    const cue = state.track?.suggestedCue || 0;

    if (!ytBgControllerRef.current) {
      lastLoadedVideoIdRef.current = vidId;
      createYTBackgroundPlayer(bgElementId, vidId, cue, fallbackBgVideoId).then((ctrl) => {
        ytBgControllerRef.current = ctrl;
        ctrl.ensurePlaying();
      });
    } else if (lastLoadedVideoIdRef.current !== vidId) {
      lastLoadedVideoIdRef.current = vidId;
      ytBgControllerRef.current.loadVideo(vidId, cue);
    } else {
      ytBgControllerRef.current.ensurePlaying();
    }
  }, [youtubeVideoId, bgElementId, fallbackBgVideoId, state.track?.suggestedCue]);

  // Ensure background video stays playing when deck state toggles
  React.useEffect(() => {
    if (!isArchiveTrack && ytBgControllerRef.current) {
      ytBgControllerRef.current.ensurePlaying();
    }
  }, [state.isPlaying, isArchiveTrack]);

  // Sync play/pause state with the bottom-layer Archive video on both decks
  React.useEffect(() => {
    if (isArchiveTrack && archiveBgVideoRef.current) {
      const vid = archiveBgVideoRef.current;
      vid.muted = true;
      vid.play().catch(() => {});
    }
  }, [state.isPlaying, isArchiveTrack, state.track?.mediaUrl]);

  // Sync seek / cue jumps & playback rate with the bottom-layer video
  React.useEffect(() => {
    const drift = Math.abs(state.currentTime - lastSyncedTimeRef.current);
    lastSyncedTimeRef.current = state.currentTime;

    if (drift > 2.5) {
      if (isArchiveTrack && archiveBgVideoRef.current) {
        try {
          archiveBgVideoRef.current.currentTime = state.currentTime;
        } catch {}
      } else if (!isArchiveTrack && ytBgControllerRef.current && state.isPlaying) {
        ytBgControllerRef.current.seekTo(state.currentTime);
      }
    }
  }, [state.currentTime, isArchiveTrack, state.isPlaying]);

  React.useEffect(() => {
    const rate = Math.max(0.5, Math.min(2.0, 1 + state.pitch / 100));
    if (isArchiveTrack && archiveBgVideoRef.current) {
      try {
        archiveBgVideoRef.current.playbackRate = rate;
      } catch {}
    } else if (!isArchiveTrack && ytBgControllerRef.current) {
      ytBgControllerRef.current.setPlaybackRate(rate);
    }
  }, [state.pitch, isArchiveTrack]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-0 flex flex-col bg-neutral-950 rounded-2xl border-2 ${
        isDraggingOver ? 'border-emerald-400 shadow-emerald-500/30' : accentBorder
      } p-2.5 sm:p-3 shadow-2xl gap-2.5 relative group`}
    >
      {/* Drag & Drop Local File Glow Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 rounded-2xl bg-black/90 border-4 border-dashed border-emerald-400 flex flex-col items-center justify-center gap-3 backdrop-blur-sm animate-pulse pointer-events-none">
          <FolderUp className="w-12 h-12 text-emerald-400 animate-bounce" />
          <div className="text-center">
            <span className="text-sm font-black text-white uppercase tracking-wider block">
              DROP AUDIO OR VIDEO FILE TO LOAD DECK {state.id}
            </span>
            <span className="text-xs text-neutral-400 font-sans mt-1 block">
              Supports MP3, WAV, MP4, FLAC, M4A, OGG, WEBM · Auto-detects BPM & Key
            </span>
          </div>
        </div>
      )}

      {/* BOTTOM LAYER FULL-DECK LIVE VIDEO BACKGROUND: Plays under the entire deck on both sides without flashing */}
      <div
        className="yt-stage-container absolute inset-0 z-0 rounded-2xl overflow-hidden pointer-events-none select-none bg-black"
        style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
      >
        {/* Animated Aurora & Grid Base Layer */}
        <div
          className={`absolute inset-0 z-0 pointer-events-none animate-bg-aurora ${
            isDeckA
              ? 'bg-gradient-to-br from-cyan-950/60 via-neutral-950 to-purple-950/50'
              : 'bg-gradient-to-br from-amber-950/60 via-neutral-950 to-rose-950/50'
          }`}
        >
          <div className="absolute -inset-12 animate-bg-grid opacity-50" />
        </div>

        {/* Animated Ken-Burns Artwork Base Fallback */}
        {state.track?.thumbnailUrl && (
          <img
            src={state.track.thumbnailUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="absolute inset-0 z-0 w-full h-full object-cover opacity-40 pointer-events-none animate-bg-kenburns"
          />
        )}

        {/* Persistent Live YouTube Video Playing on Bottom Layer Under Deck (16:9 Cover Locked) */}
        <div
          className={`absolute inset-0 z-[1] overflow-hidden ${
            isArchiveTrack && state.track?.mediaType !== 'audio' ? 'opacity-0' : 'opacity-80'
          }`}
          style={{ transform: 'translateZ(0)' }}
        >
          <div className="yt-cover-frame pointer-events-none">
            <div id={bgElementId} className="w-full h-full pointer-events-none" />
          </div>
        </div>

        {/* Live Archive.org Video Playing on Bottom Layer Under Deck */}
        <div
          className={`absolute inset-0 z-[2] overflow-hidden ${
            isArchiveTrack && state.track?.mediaUrl && state.track?.mediaType !== 'audio'
              ? 'opacity-85'
              : 'opacity-0'
          }`}
          style={{ transform: 'translateZ(0)' }}
        >
          <video
            ref={archiveBgVideoRef}
            src={isArchiveTrack && state.track?.mediaType !== 'audio' ? state.track?.mediaUrl : undefined}
            muted
            autoPlay
            loop
            playsInline
            className="w-full h-full object-cover scale-105 pointer-events-none"
          />
        </div>

        {/* Clean Dark Tint Overlay (no backdrop-filter so cross-origin video never flickers) */}
        <div className="absolute inset-0 z-[3] pointer-events-none bg-neutral-950/45" />

        {/* Animated neon deck edge vignette */}
        <div
          className={`absolute inset-0 z-[4] pointer-events-none animate-bg-aurora ${
            isDeckA
              ? 'bg-gradient-to-b from-cyan-950/25 via-transparent to-black/55'
              : 'bg-gradient-to-b from-amber-950/25 via-transparent to-black/55'
          }`}
        />
      </div>

      {/* Real GUI controls sit in z-10 with clean translucent styling (no backdrop-blur) so video underneath is rock-solid */}
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
              <div className="flex items-center gap-2 text-xs text-neutral-300 truncate mt-0.5">
                <span className="truncate">{state.track ? state.track.artist : 'Load a track to start'}</span>
                {state.track?.genre && (
                  <>
                    <span aria-hidden="true" className="text-neutral-500">·</span>
                    <span className="text-neutral-400 truncate">{state.track.genre}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Controls: Search Input + Local File + DynaMix + Load Track Button */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {/* Quick Search Next to Load Track */}
            <DeckQuickSearch
              deckId={state.id}
              onLoadTrack={onLoadTrack}
              accentColor={accentColor}
              customTracks={customTracks}
              resetTrigger={resetSearchTrigger}
            />

            {/* Hidden Local File Input */}
            <input
              type="file"
              ref={localFileInputRef}
              onChange={handleLocalFileChange}
              accept="audio/*,video/*,.mp3,.wav,.flac,.m4a,.ogg,.aac,.mp4,.webm"
              className="hidden"
            />

            {/* Load Local Audio/Video File Button */}
            <button
              onClick={() => localFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-neutral-900/90 hover:bg-neutral-800 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-400 transition-colors shrink-0 active:scale-95 shadow-sm"
              title="Load local audio or video file (MP3, WAV, MP4, FLAC, M4A, etc.) into Deck"
            >
              <FolderUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">LOCAL FILE</span>
              <span className="sm:hidden">LOCAL</span>
            </button>

            {/* DynaMix Audio Transition & Energy Analysis Button */}
            {onOpenDynaMix && (
              <button
                onClick={onOpenDynaMix}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 transition-colors shrink-0 active:scale-95 shadow-sm"
                title="Open DynaMix Audio Transition & Energy Analysis"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">DYNAMIX</span>
              </button>
            )}

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

        {/* Real-Time Beat FX & 3-Slot Fader FX Suite */}
        <DeckTopFxBar
          deckId={state.id}
          effectiveBpm={state.effectiveBpm}
          accentColor={accentColor}
          onOpenFaderFx={onOpenFaderFx}
        />

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
                className={`flex-1 h-16 rounded-xl flex flex-col items-center justify-center font-mono font-black text-sm tracking-wider uppercase border transition-all active:scale-95 shadow-md ${
                  isDeckA
                    ? 'bg-cyan-950/75 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/25 active:bg-cyan-500 active:text-black'
                    : 'bg-amber-950/75 text-amber-300 border-amber-500/50 hover:bg-amber-500/25 active:bg-amber-500 active:text-black'
                }`}
                title="Cue: Return to cue point and pause (Hold to preview)"
              >
                <span>CUE</span>
                <span className="text-[9px] font-normal text-neutral-300">PFL</span>
              </button>

              {/* PLAY / PAUSE Button */}
              <button
                onClick={onPlayPause}
                className={`flex-1 h-16 rounded-xl flex flex-col items-center justify-center font-mono font-black text-sm tracking-wider uppercase border transition-all active:scale-95 shadow-md ${
                  state.isPlaying
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-emerald-500/40'
                    : 'bg-neutral-950/75 text-emerald-400 border-emerald-500/50 hover:bg-neutral-900/85'
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

          {/* 3-Band Equalizer, Filter & Neural Mix AI Stems */}
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
            neuralMix={state.neuralMix}
            onChangeNeuralMix={onChangeNeuralMix}
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
