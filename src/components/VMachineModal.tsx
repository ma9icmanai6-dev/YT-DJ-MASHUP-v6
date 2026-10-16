import React, { useState } from 'react';
import { VMachineViewer, VMachineLoopPreset } from './VMachineViewer';
import { audioFx } from '../services/audioFx';
import { Sparkles, Sliders, Layers, X, Play, Music, Radio, Volume2 } from 'lucide-react';

interface VMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPlayingA: boolean;
  isPlayingB: boolean;
  bpmA: number;
  bpmB: number;
  crossfader: number;
}

export const VMachineModal: React.FC<VMachineModalProps> = ({
  isOpen,
  onClose,
  isPlayingA,
  isPlayingB,
  bpmA,
  bpmB,
  crossfader,
}) => {
  if (!isOpen) return null;

  const [preset, setPreset] = useState<VMachineLoopPreset>('cyber-grid');
  const [activeTab, setActiveTab] = useState<'visualizer' | 'synth-rack'>('visualizer');

  // Trigger synth / drum sound bursts from audioFx
  const playSample = (sample: 'horn' | 'scratch' | 'drop' | 'laser' | 'siren' | 'rewind') => {
    switch (sample) {
      case 'horn':
        audioFx.playAirhorn();
        break;
      case 'scratch':
        audioFx.playVinylScratch();
        break;
      case 'drop':
        audioFx.play808Drop();
        break;
      case 'laser':
        audioFx.playLaser();
        break;
      case 'siren':
        audioFx.playSiren();
        break;
      case 'rewind':
        audioFx.playTapeStop();
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none">
      <div className="w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 text-black shadow-md">
              <Sparkles className="w-4 h-4 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide uppercase">
                  V-MACHINE STUDIO CONSOLE
                </span>
                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] rounded font-bold">
                  macOS VST / Audio Unit Host & Visual Synthesizer (goolygu/v_machine)
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Real-time procedural VJ loop generator, tempo-synced shader graphics & sound triggers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center p-0.5 bg-black rounded-lg border border-neutral-800 text-[10px]">
              <button
                onClick={() => setActiveTab('visualizer')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'visualizer' ? 'bg-amber-500 text-black shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                VISUAL ENGINE
              </button>
              <button
                onClick={() => setActiveTab('synth-rack')}
                className={`px-2.5 py-1 rounded font-bold transition-all ${
                  activeTab === 'synth-rack' ? 'bg-amber-500 text-black shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                SYNTH PADS
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'visualizer' && (
            <div className="flex flex-col gap-3">
              {/* Preset Selector Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-[11px] font-bold text-neutral-400 shrink-0">PRESETS:</span>
                {(
                  [
                    { id: 'cyber-grid', label: 'CYBER GRID' },
                    { id: 'quantum-tunnel', label: 'QUANTUM TUNNEL' },
                    { id: 'neon-mandala', label: 'NEON MANDALA' },
                    { id: 'acid-fractal', label: 'ACID FRACTAL' },
                    { id: 'matrix-flow', label: 'MATRIX FLOW' },
                    { id: 'rave-laser', label: 'RAVE LASER' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 border ${
                      preset === p.id
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* VMachine Screen Preview Container */}
              <div className="w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-neutral-800 bg-black relative shadow-2xl">
                <VMachineViewer
                  isPlayingA={isPlayingA}
                  isPlayingB={isPlayingB}
                  bpmA={bpmA}
                  bpmB={bpmB}
                  crossfader={crossfader}
                  defaultPreset={preset}
                  className="w-full h-full"
                />
              </div>

              {/* Status and BPM Sync Monitor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">DECK A BPM:</span>
                  <span className="font-bold text-cyan-400">{bpmA.toFixed(1)} BPM</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">DECK B BPM:</span>
                  <span className="font-bold text-amber-400">{bpmB.toFixed(1)} BPM</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
                  <span className="text-neutral-400 font-medium">CROSSFADER:</span>
                  <span className="font-bold text-purple-400">
                    {crossfader < 0 ? `DECK A (${Math.round((1 - crossfader) * 50)}%)` : `DECK B (${Math.round((1 + crossfader) * 50)}%)`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'synth-rack' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <div className="flex items-center gap-2 mb-3">
                  <Music className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Virtual Synth & Drum Sampler Trigger Pads
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mb-4 font-sans leading-relaxed">
                  Fire synchronized audio drops, sub-bass impacts, lasers, and rewinds directly into your DJ mix.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => playSample('drop')}
                    className="p-4 rounded-xl bg-gradient-to-br from-indigo-950 to-neutral-900 hover:from-indigo-900 hover:to-neutral-800 border border-indigo-700/50 text-indigo-300 font-black text-xs transition-all active:scale-95 shadow-md flex flex-col items-center gap-2"
                  >
                    <Radio className="w-5 h-5 text-indigo-400" />
                    <span>SUB-BASS DROP</span>
                  </button>

                  <button
                    onClick={() => playSample('horn')}
                    className="p-4 rounded-xl bg-gradient-to-br from-amber-950 to-neutral-900 hover:from-amber-900 hover:to-neutral-800 border border-amber-700/50 text-amber-300 font-black text-xs transition-all active:scale-95 shadow-md flex flex-col items-center gap-2"
                  >
                    <Volume2 className="w-5 h-5 text-amber-400" />
                    <span>REGGAE AIR HORN</span>
                  </button>

                  <button
                    onClick={() => playSample('laser')}
                    className="p-4 rounded-xl bg-gradient-to-br from-cyan-950 to-neutral-900 hover:from-cyan-900 hover:to-neutral-800 border border-cyan-700/50 text-cyan-300 font-black text-xs transition-all active:scale-95 shadow-md flex flex-col items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span>SYNTH LASER</span>
                  </button>

                  <button
                    onClick={() => playSample('scratch')}
                    className="p-4 rounded-xl bg-gradient-to-br from-purple-950 to-neutral-900 hover:from-purple-900 hover:to-neutral-800 border border-purple-700/50 text-purple-300 font-black text-xs transition-all active:scale-95 shadow-md flex flex-col items-center gap-2"
                  >
                    <Sliders className="w-5 h-5 text-purple-400" />
                    <span>VINYL SCRATCH</span>
                  </button>

                  <button
                    onClick={() => playSample('siren')}
                    className="p-4 rounded-xl bg-gradient-to-br from-red-950 to-neutral-900 hover:from-red-900 hover:to-neutral-800 border border-red-700/50 text-red-300 font-black text-xs transition-all active:scale-95 shadow-md flex flex-col items-center gap-2"
                  >
                    <Play className="w-5 h-5 text-red-400" />
                    <span>RAVE DUB SIREN</span>
                  </button>

                  <button
                    onClick={() => playSample('rewind')}
                    className="p-4 rounded-xl bg-gradient-to-br from-emerald-950 to-neutral-900 hover:from-emerald-900 hover:to-neutral-800 border border-emerald-700/50 text-emerald-300 font-black text-xs transition-all active:scale-95 shadow-md flex flex-col items-center gap-2"
                  >
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <span>TAPE REWIND</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
