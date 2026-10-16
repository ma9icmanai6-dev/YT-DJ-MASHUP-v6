import React from 'react';
import { checkKeyCompatibility } from '../data/presets';
import {
  Disc,
  FolderOpen,
  Radio,
  Keyboard,
  Layers,
  Sliders,
  Volume2,
  VolumeX,
  Sparkles,
  Shuffle,
  Zap,
  FolderUp,
  Activity,
} from 'lucide-react';

interface HeaderProps {
  displayMode: 'dual' | 'blend' | 'audio-only';
  onChangeDisplayMode: (mode: 'dual' | 'blend' | 'audio-only') => void;
  keyA?: string;
  keyB?: string;
  isRecording: boolean;
  onOpenCrateModal: () => void;
  onOpenRecordingModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenMidiModal?: () => void;
  onOpenMixxxFx?: () => void;
  onOpenFaderFx?: () => void;
  onOpenDynaMix?: () => void;
  onOpenVMachine?: () => void;
  onOpenLocalFile?: () => void;
  connectedControllersCount?: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onRandomMashup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  displayMode,
  onChangeDisplayMode,
  keyA,
  keyB,
  isRecording,
  onOpenCrateModal,
  onOpenRecordingModal,
  onOpenShortcutsModal,
  onOpenMidiModal,
  onOpenMixxxFx,
  onOpenFaderFx,
  onOpenDynaMix,
  onOpenVMachine,
  onOpenLocalFile,
  connectedControllersCount = 0,
  isMuted,
  onToggleMute,
  onRandomMashup,
}) => {
  const compatibility = keyA && keyB ? checkKeyCompatibility(keyA, keyB) : null;

  return (
    <header className="w-full min-w-full shrink-0 bg-gradient-to-r from-neutral-950 via-slate-900 to-neutral-950 animate-bg-aurora border-b border-neutral-800 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-lg select-none relative overflow-hidden">
      {/* Brand & Identity */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-600 to-amber-500 p-0.5 flex items-center justify-center shadow-md shadow-cyan-500/20">
          <div className="w-full h-full bg-neutral-950 rounded-[7px] flex items-center justify-center">
            <Disc className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm sm:text-base font-mono font-black tracking-tight text-white uppercase leading-none">
              DJ YOUTUBE MASHUP
            </h1>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 leading-tight mt-0.5">
            <span>DUAL-DECK MIXING STUDIO</span>
            <span aria-hidden="true">·</span>
            <span>PRO AUDIO & VJ CONSOLE</span>
          </div>
        </div>
      </div>

      {/* Harmonic Key Compatibility Pill */}
      {compatibility && (
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-neutral-400 font-medium">Harmonic:</span>
          <span
            className={`font-bold ${
              compatibility.match ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {compatibility.type}
          </span>
          <span className="text-neutral-500 text-[10px]">
            ({keyA} &times; {keyB})
          </span>
        </div>
      )}

      {/* View Mode Segmented Controls & Action Tools */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {/* Display Mode Switcher */}
        <div className="flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono">
          <button
            onClick={() => onChangeDisplayMode('dual')}
            className={`px-2 py-1 rounded-md font-semibold transition-all ${
              displayMode === 'dual'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Side-by-side Dual Decks with live video screens"
          >
            Dual Decks
          </button>

          <button
            onClick={() => onChangeDisplayMode('blend')}
            className={`px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
              displayMode === 'blend'
                ? 'bg-neutral-800 text-cyan-300 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Live Crossfader Video Blend (VJ Projection Mode)"
          >
            <Layers className="w-3 h-3" />
            <span>VJ Blend</span>
          </button>

          <button
            onClick={() => onChangeDisplayMode('audio-only')}
            className={`px-2 py-1 rounded-md font-semibold transition-all ${
              displayMode === 'audio-only'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Audio Hardware Console (Maximizes jog wheels and faders)"
          >
            Audio Only
          </button>
        </div>

        {/* Crate Modal Button */}
        <button
          onClick={onOpenCrateModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all active:scale-95 shadow-sm"
          title="Browse Curated Mashups & Crate Tracks"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>CRATES</span>
        </button>

        {/* Record / Recipe Button */}
        <button
          onClick={onOpenRecordingModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border active:scale-95 ${
            isRecording
              ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/30'
              : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
          }`}
          title="Record live DJ set and export mashup recipe"
        >
          <Radio className={`w-3.5 h-3.5 ${isRecording ? 'text-white' : 'text-red-400'}`} />
          <span className="hidden sm:inline">{isRecording ? 'REC ON' : 'RECIPE'}</span>
        </button>

        {/* MIDI & Hardware Controller Button */}
        {onOpenMidiModal && (
          <button
            onClick={onOpenMidiModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border active:scale-95 ${
              connectedControllersCount > 0
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
            }`}
            title="OpenMix MIDI Hardware Controller & Gamepad Mapping"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {connectedControllersCount > 0 ? `MIDI (${connectedControllersCount})` : 'CONTROLLER'}
            </span>
          </button>
        )}

        {/* Mixxx Built-in DSP Effects Suite Button */}
        {onOpenMixxxFx && (
          <button
            onClick={onOpenMixxxFx}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border active:scale-95 bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30 shadow-sm"
            title="Mixxx Built-in Effects Suite (Modular Rack, Super Knob, Echo, Flanger, Reverb, Filter)"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">MIXXX FX</span>
          </button>
        )}

        {/* Fader FX & 3-Slot MacroFX Chains (Ean Golden Fader FX Theory & Pioneer SoundColorFX) */}
        {onOpenFaderFx && (
          <button
            onClick={onOpenFaderFx}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border active:scale-95 bg-gradient-to-r from-purple-500/25 to-pink-500/25 text-pink-300 border-pink-500/50 hover:from-purple-500/35 hover:to-pink-500/35 shadow-sm"
            title="Fader FX Theory (Ean Golden 2008), 3-Slot MacroFX Chains, Pioneer SoundColorFX & JogFX"
          >
            <Zap className="w-3.5 h-3.5 text-pink-400 fill-current" />
            <span className="hidden sm:inline">FADER FX</span>
          </button>
        )}

        {/* DynaMix Audio Transition & Energy Analysis Engine */}
        {onOpenDynaMix && (
          <button
            onClick={onOpenDynaMix}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border active:scale-95 bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30 shadow-sm"
            title="DynaMix (makalin/dynamix): Dynamic audio transition strategy & energy RMS profiling"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">DYNAMIX</span>
          </button>
        )}

        {/* V-Machine Visual Synthesizer & Audio Host */}
        {onOpenVMachine && (
          <button
            onClick={onOpenVMachine}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border active:scale-95 bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 shadow-sm"
            title="V-Machine (goolygu/v_machine): macOS VST/Audio Unit Host & Live Shader Synthesizer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">V-MACHINE</span>
          </button>
        )}

        {/* Quick Load Local File Button */}
        {onOpenLocalFile && (
          <button
            onClick={onOpenLocalFile}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border active:scale-95 bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 shadow-sm"
            title="Load local audio or video file (MP3, WAV, FLAC, MP4, M4A, etc.) into DJ Studio"
          >
            <FolderUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">LOAD FILE</span>
          </button>
        )}

        {/* Shortcuts Button */}
        <button
          onClick={onOpenShortcutsModal}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
          title="Keyboard Shortcuts Map"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Sound FX Mute Toggle */}
        <button
          onClick={onToggleMute}
          className={`p-1.5 rounded-lg border transition-colors ${
            isMuted
              ? 'bg-red-950/60 border-red-800 text-red-400'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
          title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
