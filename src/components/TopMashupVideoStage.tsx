import React, { useState, useEffect } from 'react';
import { DeckTrack } from '../types/dj';
import { getLiveLyricState, TRACK_LYRICS } from '../data/lyrics';
import {
  AwesomeAudioVisualizer,
  VisualizerMode,
  VisualizerTheme,
} from './AwesomeAudioVisualizer';
import {
  Maximize2,
  Minimize2,
  Sparkles,
  Subtitles,
  Split,
  Edit3,
  Layers,
  Columns,
  Play,
  Pause,
  Tv,
  ChevronsUp,
  ChevronsDown,
  Zap,
  Sliders,
  Palette,
  Eye,
  Flame,
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

export type BlendVisualMode = 'screen' | 'alpha' | 'split-wipe' | 'side-by-side' | 'pip' | 'difference';

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
  // Default to DOUBLED (2X) top stage size with a Minimize button to shrink in
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Awesome Audio Visualizer state (inspired by VolkanSah/Awesome-Audio-Visualizer & lzhangbj/ASVA)
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('asva-motion');
  const [visualizerTheme, setVisualizerTheme] = useState<VisualizerTheme>('cyber-dual');
  const [visualizerBlend, setVisualizerBlend] = useState<'screen' | 'overlay' | 'difference' | 'normal'>('screen');
  const [visualizerOpacity, setVisualizerOpacity] = useState<number>(0.85);
  const [visualizerArea, setVisualizerArea] = useState<'cinema' | 'full-stage'>('cinema');

  // Live Video Mixing Effects Suite (Including ASVA Audio-Synchronized Visual Animation)
  const [videoFx, setVideoFx] = useState<{
    glitch: boolean;
    beatPulse: boolean;
    cyberpunk: boolean;
    acidTrip: boolean;
    vhsTracking: boolean;
    bloom: boolean;
    mirror: boolean;
    strobe: boolean;
    invert: boolean;
    asvaMotion: boolean;
  }>({
    glitch: false,
    beatPulse: false,
    cyberpunk: false,
    acidTrip: false,
    vhsTracking: false,
    bloom: false,
    mirror: false,
    strobe: false,
    invert: false,
    asvaMotion: true,
  });

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
  const lyricLineA = trackA ? getLiveLyricState(trackA, currentTimeA).currentLine : null;
  const lyricLineB = trackB ? getLiveLyricState(trackB, currentTimeB).currentLine : null;

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
      className="w-full min-w-full shrink-0 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 animate-bg-aurora border border-neutral-800 rounded-xl px-2.5 py-2 shadow-xl flex flex-col gap-1.5 relative overflow-hidden"
    >
      {/* Full Top Stage Visualizer Layer (Stretches Edge-to-Edge Across the Entire Top Area) */}
      {visualizerMode !== 'none' && visualizerArea === 'full-stage' && (
        <div className="absolute inset-0 w-full h-full min-w-full pointer-events-none z-[22] overflow-hidden">
          <AwesomeAudioVisualizer
            mode={visualizerMode}
            theme={visualizerTheme}
            opacity={visualizerOpacity}
            blendMode={visualizerBlend}
            isPlayingA={isPlayingA}
            isPlayingB={isPlayingB}
            bpmA={bpmA}
            bpmB={bpmB}
            currentTimeA={currentTimeA}
            currentTimeB={currentTimeB}
            crossfader={crossfader}
          />
        </div>
      )}

      {/* Top Bar: Blend Mode Selector, CC Accapella Toggle, Minimize (Shrink In) & Fullscreen */}
      <div className="w-full flex flex-wrap items-center justify-between border-b border-neutral-800 pb-1.5 gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-mono font-bold text-white shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlayingA || isPlayingB ? 'bg-red-500 animate-ping' : 'bg-emerald-500'
              }`}
            />
            <span>MASHUP VIDEO SCREEN ({isMinimized ? '1X COMPACT' : '2X DOUBLE SIZE'})</span>
          </div>

          <span className="hidden xl:inline text-[11px] font-mono text-neutral-400">
            {blendMode === 'screen'
              ? '✨ Screen Mashup Active: Dual Videos Blended Full-Width (Deck A + Deck B)'
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

            <button
              onClick={() => handleSelectBlendMode('pip')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                blendMode === 'pip'
                  ? 'bg-amber-500 text-black font-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Picture-in-Picture: Deck B floating video monitor over Deck A"
            >
              <Tv className="w-3 h-3" />
              <span>PiP Cam</span>
            </button>

            <button
              onClick={() => handleSelectBlendMode('difference')}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                blendMode === 'difference'
                  ? 'bg-rose-500 text-black font-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Difference Video Synth: High contrast chromatic psychedelic inversion"
            >
              <Sparkles className="w-3 h-3" />
              <span>Synth Invert</span>
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

          {/* MINIMIZE / EXPAND 2X BUTTON TO SHRINK IN OR DOUBLE TOP STAGE */}
          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-black border transition-all active:scale-95 shadow-sm ${
              isMinimized
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-300'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/60'
            }`}
            title={
              isMinimized
                ? 'Expand Top Video Stage to Double Size (2X)'
                : 'Minimize / Shrink In Top Video Stage'
            }
          >
            {isMinimized ? (
              <>
                <ChevronsDown className="w-3.5 h-3.5" />
                <span>EXPAND 2X</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>MINIMIZE</span>
              </>
            )}
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

      {/* VJ Visualizer Engine & Video Post-FX Rack (Inspired by VolkanSah/Awesome-Audio-Visualizer) */}
      <div className="flex flex-col gap-1.5 px-3 py-2 bg-neutral-950/95 border-b border-neutral-800 text-[10px] font-mono select-none">
        {/* Tier 1: Awesome Audio Visualizer Engine Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>AUDIO VISUALIZER:</span>
            </span>

            {(
              [
                { id: 'none', label: 'OFF' },
                { id: 'asva-motion', label: 'ASVA MOTION' },
                { id: 'v-machine', label: 'V-MACHINE MTD' },
                { id: 'radial-pulse', label: 'RADIAL PULSE' },
                { id: 'synthwave-3d', label: 'SYNTHWAVE 3D' },
                { id: 'kaleidoscope', label: 'KALEIDOSCOPE' },
                { id: 'spectrum-bars', label: 'SPECTRUM BARS' },
                { id: 'cyber-matrix', label: 'CYBER MATRIX' },
                { id: 'starfield-warp', label: 'STARFIELD WARP' },
                { id: 'laser-osc', label: 'LASER OSC' },
                { id: 'plasma-ripple', label: 'PLASMA RIPPLE' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setVisualizerMode(m.id)}
                className={`px-2 py-0.5 rounded border transition-all active:scale-95 ${
                  visualizerMode === m.id
                    ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
                title={`Select ${m.label} Audio-Reactive Visualizer`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Visualizer Fine-Tuning Controls */}
          {visualizerMode !== 'none' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Color Theme */}
              <div className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                <Palette className="w-3 h-3 text-cyan-400" />
                <span className="text-neutral-500 text-[9px]">COLOR:</span>
                <select
                  value={visualizerTheme}
                  onChange={(e) => setVisualizerTheme(e.target.value as VisualizerTheme)}
                  className="bg-transparent text-white text-[10px] focus:outline-none cursor-pointer"
                >
                  <option value="cyber-dual" className="bg-neutral-900 text-cyan-400">Cyber Dual (Deck A/B)</option>
                  <option value="neon-sunset" className="bg-neutral-900 text-pink-400">Neon Sunset</option>
                  <option value="matrix-green" className="bg-neutral-900 text-emerald-400">Matrix Green</option>
                  <option value="solar-gold" className="bg-neutral-900 text-amber-400">Solar Gold</option>
                  <option value="ice-blue" className="bg-neutral-900 text-sky-400">Ice Blue</option>
                </select>
              </div>

              {/* Blend Mode */}
              <div className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span className="text-neutral-500 text-[9px]">BLEND:</span>
                <select
                  value={visualizerBlend}
                  onChange={(e) => setVisualizerBlend(e.target.value as any)}
                  className="bg-transparent text-white text-[10px] focus:outline-none cursor-pointer"
                >
                  <option value="screen" className="bg-neutral-900">Screen Glow</option>
                  <option value="overlay" className="bg-neutral-900">Overlay VJ</option>
                  <option value="difference" className="bg-neutral-900">Difference</option>
                  <option value="normal" className="bg-neutral-900">Solo Synth (Full Visual)</option>
                </select>
              </div>

              {/* Area Stretch Selector */}
              <div className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                <Maximize2 className="w-3 h-3 text-cyan-400" />
                <span className="text-neutral-500 text-[9px]">AREA:</span>
                <select
                  value={visualizerArea}
                  onChange={(e) => setVisualizerArea(e.target.value as any)}
                  className="bg-transparent text-white text-[10px] focus:outline-none cursor-pointer font-bold"
                >
                  <option value="cinema" className="bg-neutral-900">100% Cinema Screen</option>
                  <option value="full-stage" className="bg-neutral-900">Full Top Stage (Whole Area)</option>
                </select>
              </div>

              {/* Opacity Slider */}
              <div className="flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                <Eye className="w-3 h-3 text-cyan-400" />
                <span className="text-neutral-500 text-[9px]">OPACITY:</span>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.05}
                  value={visualizerOpacity}
                  onChange={(e) => setVisualizerOpacity(parseFloat(e.target.value))}
                  className="w-16 h-1.5 accent-cyan-400 cursor-pointer bg-neutral-800 rounded"
                />
                <span className="text-cyan-400 text-[9px] w-6 text-right font-bold">
                  {Math.round(visualizerOpacity * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tier 2: Live Video Post-FX Controls */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-neutral-900">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>VIDEO POST FX:</span>
            </span>

            {/* ASVA: Audio-Synchronized Visual Animation (ECCV 2024 - lzhangbj/ASVA) */}
            <button
              onClick={() => setVideoFx((p) => ({ ...p, asvaMotion: !p.asvaMotion }))}
              className={`px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
                videoFx.asvaMotion
                  ? 'bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 text-black border-cyan-300 font-black shadow-md'
                  : 'bg-neutral-900 text-cyan-400 border-cyan-800/60 hover:text-white hover:border-cyan-500'
              }`}
              title="ASVA (ECCV 2024): Audio-Synchronized Visual Animation - temporally guides video dynamics, mesh deformation, and optical flow"
            >
              <Sparkles className="w-3 h-3 fill-current" />
              <span>ASVA MOTION</span>
            </button>

            <button
              onClick={() => setVideoFx((p) => ({ ...p, glitch: !p.glitch }))}
              className={`px-2 py-0.5 rounded border transition-all ${
                videoFx.glitch
                  ? 'bg-red-500 text-black border-red-400 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Chromatic RGB split and digital glitch displacement"
            >
              RGB GLITCH
            </button>

            <button
              onClick={() => setVideoFx((p) => ({ ...p, beatPulse: !p.beatPulse }))}
              className={`px-2 py-0.5 rounded border transition-all ${
                videoFx.beatPulse
                  ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Audio-reactive scale zoom pulse synchronized to track BPM"
            >
              BEAT PULSE
            </button>

            <button
              onClick={() => setVideoFx((p) => ({ ...p, cyberpunk: !p.cyberpunk }))}
              className={`px-2 py-0.5 rounded border transition-all ${
                videoFx.cyberpunk
                  ? 'bg-fuchsia-500 text-black border-fuchsia-400 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Saturated cyberpunk neon color grade"
            >
              CYBERPUNK
            </button>

            <button
              onClick={() => setVideoFx((p) => ({ ...p, acidTrip: !p.acidTrip }))}
              className={`px-2 py-0.5 rounded border transition-all ${
                videoFx.acidTrip
                  ? 'bg-violet-500 text-black border-violet-400 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Acid psychedelic color spectrum cycling"
            >
              ACID TRIP
            </button>

            <button
              onClick={() => setVideoFx((p) => ({ ...p, vhsTracking: !p.vhsTracking }))}
              className={`px-2 py-0.5 rounded border transition-all ${
                videoFx.vhsTracking
                  ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Analog VHS tape tracking distortion"
            >
              VHS TAPE
            </button>

            <button
              onClick={() => setVideoFx((p) => ({ ...p, bloom: !p.bloom }))}
              className={`px-2 py-0.5 rounded border transition-all ${
                videoFx.bloom
                  ? 'bg-sky-400 text-black border-sky-300 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="High-luma concert lens bloom"
            >
              BLOOM
            </button>

            <button
              onClick={() => setVideoFx((p) => ({ ...p, mirror: !p.mirror }))}
              className={`px-2 py-0.5 rounded border transition-all ${
                videoFx.mirror
                  ? 'bg-amber-500 text-black border-amber-400 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Horizontal mirror reflection"
            >
              MIRROR H
            </button>

            <button
              onClick={() => setVideoFx((p) => ({ ...p, strobe: !p.strobe }))}
              className={`px-2 py-0.5 rounded border transition-all ${
                videoFx.strobe
                  ? 'bg-yellow-400 text-black border-yellow-300 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Rave strobe flash overlay on beat drop"
            >
              STROBE
            </button>

            <button
              onClick={() => setVideoFx((p) => ({ ...p, invert: !p.invert }))}
              className={`px-2 py-0.5 rounded border transition-all ${
                videoFx.invert
                  ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-sm'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Invert negative video color spectrum"
            >
              INVERT
            </button>
          </div>

          {(videoFx.glitch ||
            videoFx.beatPulse ||
            videoFx.cyberpunk ||
            videoFx.acidTrip ||
            videoFx.vhsTracking ||
            videoFx.bloom ||
            videoFx.mirror ||
            videoFx.strobe ||
            videoFx.invert ||
            videoFx.asvaMotion) && (
            <button
              onClick={() =>
                setVideoFx({
                  glitch: false,
                  beatPulse: false,
                  cyberpunk: false,
                  acidTrip: false,
                  vhsTracking: false,
                  bloom: false,
                  mirror: false,
                  strobe: false,
                  invert: false,
                  asvaMotion: false,
                })
              }
              className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[9px] font-bold border border-neutral-700"
            >
              RESET ALL FX
            </button>
          )}
        </div>
      </div>

      {/* ONE UNIFIED WIDESCREEN CINEMA STAGE WITH TWO VIDEOS BLENDED FULL & FIXED 100% WIDTH */}
      <div
        className={`w-full min-w-full relative rounded-lg overflow-hidden bg-black border border-neutral-800 shadow-inner select-none transition-[height] duration-300 ease-in-out ${
          displayMode === 'audio-only'
            ? 'h-14'
            : isMinimized
            ? 'h-[195px] sm:h-[225px] lg:h-[255px]'
            : 'h-[390px] sm:h-[450px] lg:h-[510px]'
        } ${videoFx.glitch ? 'fx-glitch' : ''} ${videoFx.beatPulse ? 'fx-pulse' : ''} ${
          videoFx.cyberpunk ? 'fx-cyberpunk' : ''
        } ${videoFx.acidTrip ? 'fx-acid-trip' : ''} ${videoFx.vhsTracking ? 'fx-vhs-tracking' : ''} ${
          videoFx.bloom ? 'fx-bloom' : ''
        } ${videoFx.mirror ? 'fx-mirror-h' : ''} ${videoFx.invert ? 'fx-invert' : ''} ${
          videoFx.asvaMotion ? 'fx-asva-motion' : ''
        }`}
        style={
          {
            isolation: 'isolate',
            '--beat-pulse-speed': `${(60 / Math.max(60, isPlayingB ? bpmB : bpmA)).toFixed(2)}s`,
            '--asva-tempo': `${(60 / Math.max(60, isPlayingB ? bpmB : bpmA)).toFixed(2)}s`,
          } as React.CSSProperties
        }
      >
        {/* Realtime Strobe Flash Overlay */}
        {videoFx.strobe && (
          <div className="absolute inset-0 pointer-events-none z-40 bg-white fx-strobe-flash mix-blend-screen" />
        )}

        {/* ASVA: Audio-Synchronized Visual Animation Vector Grid Overlay (ECCV 2024 lzhangbj/ASVA) */}
        {videoFx.asvaMotion && (
          <div className="absolute inset-0 pointer-events-none z-[16] overflow-hidden mix-blend-screen opacity-60">
            <svg className="w-full h-full min-w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="asvaFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#d946ef" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              {Array.from({ length: 8 }).map((_, i) => (
                <line
                  key={`asva-line-${i}`}
                  x1="0"
                  y1={`${(i + 1) * 11.5}%`}
                  x2="100%"
                  y2={`${(i + 1) * 11.5}%`}
                  stroke="url(#asvaFlowGrad)"
                  strokeWidth="0.85"
                  strokeDasharray="6 8"
                  opacity={0.45}
                  className="animate-pulse"
                />
              ))}
            </svg>
          </div>
        )}
        {/* Animated Cyber-Stage Background Layer Behind Both Videos */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-r from-cyan-950/40 via-purple-950/35 to-amber-950/40 animate-bg-aurora">
          <div className="absolute -inset-12 animate-bg-grid opacity-45" />
        </div>

        {/* Real YouTube Players Layer (Always mounted and locked to 100% full width) */}
        <div
          className={`w-full min-w-full h-full relative z-[1] ${
            blendMode === 'side-by-side'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1 bg-black/80'
              : 'block'
          } ${displayMode === 'audio-only' ? 'opacity-20 pointer-events-none' : ''}`}
          style={{ isolation: 'isolate' }}
        >
          {/* DECK A VIDEO CONTAINER (LOCKED 100% WIDTH & 16:9 COVER SO IT NEVER SHRINKS WIDTH ON LOAD) */}
          <div
            className={`yt-stage-container overflow-hidden rounded-lg ${
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
            {/* Visual Backdrop Poster (Animated Ken-Burns) if video is loading, stopped, or audio-only Archive track */}
            <div
              className={`absolute inset-0 z-0 pointer-events-none overflow-hidden ${
                trackA?.thumbnailUrl && (embedErrorA || trackA.mediaType === 'audio')
                  ? 'opacity-100'
                  : 'opacity-40'
              }`}
            >
              {trackA?.thumbnailUrl && (
                <img
                  src={trackA.thumbnailUrl}
                  alt={trackA.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover animate-bg-kenburns"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-cyan-950/20 to-black/50" />
            </div>

            {/* Dedicated 16:9 Cover Wrapper for YouTube Player Deck A (stays exact same 100% full width on load and play) */}
            <div
              className={`yt-cover-frame z-[1] ${
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

          {/* DECK B VIDEO CONTAINER (LOCKED 100% WIDTH & 16:9 COVER SUPERIMPOSED WITH SCREEN EFFECT) */}
          <div
            className={`yt-stage-container overflow-hidden rounded-lg transition-all ${
              blendMode === 'side-by-side'
                ? 'w-full h-full relative border border-amber-500/40 bg-black'
                : blendMode === 'pip'
                ? 'absolute bottom-3 right-3 w-48 sm:w-64 aspect-video z-30 border-2 border-amber-400/90 rounded-xl shadow-2xl bg-black ring-2 ring-black/80'
                : 'absolute inset-0 w-full h-full z-10'
            }`}
            style={{
              opacity: blendMode === 'pip' ? 1 : isStackedMashup ? opacityB : 1,
              mixBlendMode:
                blendMode === 'screen'
                  ? 'screen'
                  : blendMode === 'difference'
                  ? 'difference'
                  : 'normal',
              clipPath:
                blendMode === 'split-wipe'
                  ? `polygon(${splitPercentA}% 0, 100% 0, 100% 100%, ${splitPercentA}% 100%)`
                  : undefined,
              pointerEvents:
                blendMode === 'side-by-side' || blendMode === 'pip'
                  ? 'auto'
                  : isStackedMashup && pos > 0.5
                  ? 'auto'
                  : 'none',
            }}
          >
            {/* Visual Backdrop Poster (Animated Ken-Burns) if video is loading, stopped, or audio-only Archive track */}
            <div
              className={`absolute inset-0 z-0 pointer-events-none overflow-hidden ${
                trackB?.thumbnailUrl && (embedErrorB || trackB.mediaType === 'audio')
                  ? 'opacity-100'
                  : 'opacity-40'
              }`}
            >
              {trackB?.thumbnailUrl && (
                <img
                  src={trackB.thumbnailUrl}
                  alt={trackB.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover animate-bg-kenburns"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-amber-950/20 to-black/50" />
            </div>

            {/* Dedicated 16:9 Cover Wrapper for YouTube Player Deck B (stays exact same 100% full width on load and play) */}
            <div
              className={`yt-cover-frame z-[1] ${
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
                  className="absolute inset-0 w-full h-full object-cover animate-bg-kenburns"
                  style={{ opacity: screenGlowA, mixBlendMode: 'screen' }}
                />
              )}
              {trackB?.thumbnailUrl && (
                <img
                  src={trackB.thumbnailUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover animate-bg-kenburns"
                  style={{ opacity: screenGlowB, mixBlendMode: 'screen' }}
                />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-fuchsia-500/15 to-amber-500/20 animate-bg-aurora"
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

        {/* AWESOME AUDIO VISUALIZER LAYER (100% Widescreen Cinema Stage Stretch) */}
        {visualizerMode !== 'none' && visualizerArea === 'cinema' && displayMode !== 'audio-only' && (
          <div
            className={`absolute inset-0 w-full h-full min-w-full pointer-events-none z-[18] overflow-hidden ${
              visualizerBlend === 'normal' ? 'bg-black' : ''
            }`}
            style={{ width: '100%', height: '100%', left: 0, top: 0, right: 0, bottom: 0 }}
          >
            <AwesomeAudioVisualizer
              mode={visualizerMode}
              theme={visualizerTheme}
              opacity={visualizerOpacity}
              blendMode={visualizerBlend}
              isPlayingA={isPlayingA}
              isPlayingB={isPlayingB}
              bpmA={bpmA}
              bpmB={bpmB}
              currentTimeA={currentTimeA}
              currentTimeB={currentTimeB}
              crossfader={crossfader}
            />
          </div>
        )}

        {/* CRT Scanline & Concert Atmosphere Overlay */}
        {enableScanlines && displayMode !== 'audio-only' && (
          <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-35 mix-blend-overlay" />
        )}

        {/* Live Mashup HUD Watermark + Quick Floating Minimize/Expand Toggle */}
        {displayMode !== 'audio-only' && (
          <div className="absolute top-2 inset-x-0 z-30 flex items-center justify-center gap-2 pointer-events-none flex-wrap px-4">
            {blendMode === 'screen' && (
              <div className="bg-black/80 px-3 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-2 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] font-mono font-black text-amber-300 tracking-wider">
                  SCREEN MASHUP · {weightA}% A / {weightB}% B
                </span>
              </div>
            )}
            {visualizerMode !== 'none' && (
              <div className="bg-black/85 px-3 py-0.5 rounded-full border border-cyan-500/50 flex items-center gap-1.5 shadow-xl">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span className="text-[10px] font-mono font-black text-cyan-300 tracking-wider uppercase">
                  VJ {visualizerMode.replace('-', ' ')}
                </span>
              </div>
            )}
            {videoFx.asvaMotion && (
              <div className="bg-black/90 px-3 py-0.5 rounded-full border border-fuchsia-500/60 flex items-center gap-1.5 shadow-xl animate-pulse">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" />
                <span className="text-[10px] font-mono font-black text-fuchsia-300 tracking-wider">
                  ASVA ECCV'24 · AUDIO-SYNC DYNAMICS
                </span>
              </div>
            )}
            <button
              onClick={() => setIsMinimized((prev) => !prev)}
              className="pointer-events-auto bg-black/85 hover:bg-neutral-900 px-2.5 py-0.5 rounded-full border border-neutral-700 hover:border-amber-400 text-[10px] font-mono font-black text-white flex items-center gap-1 shadow-xl transition-colors"
              title={isMinimized ? 'Expand Top Stage (2X Height)' : 'Minimize / Shrink In Top Stage'}
            >
              {isMinimized ? (
                <>
                  <ChevronsDown className="w-3 h-3 text-cyan-400" />
                  <span>EXPAND 2X</span>
                </>
              ) : (
                <>
                  <ChevronsUp className="w-3 h-3 text-amber-400" />
                  <span>MINIMIZE</span>
                </>
              )}
            </button>
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
