import React from 'react';
import { DeckTrack } from '../types/dj';
import { DynaMixProfile, calculateDynaMixTransitionStrategy, estimateDynaMixProfile } from '../services/dynamix';
import { Zap, Activity, Waves, Sliders, CheckCircle2, ArrowRight, X, Sparkles, FolderOpen } from 'lucide-react';

interface DynaMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckATrack: DeckTrack | null;
  deckBTrack: DeckTrack | null;
  onApplyCuesA?: (cues: { intro: number; drop: number; breakdown: number; outro: number }) => void;
  onApplyCuesB?: (cues: { intro: number; drop: number; breakdown: number; outro: number }) => void;
  onOpenLocalFileA?: () => void;
  onOpenLocalFileB?: () => void;
}

export const DynaMixModal: React.FC<DynaMixModalProps> = ({
  isOpen,
  onClose,
  deckATrack,
  deckBTrack,
  onApplyCuesA,
  onApplyCuesB,
  onOpenLocalFileA,
  onOpenLocalFileB,
}) => {
  if (!isOpen) return null;

  const profileA: DynaMixProfile =
    (deckATrack as any)?.dynamix ||
    estimateDynaMixProfile(deckATrack?.duration || 210, deckATrack?.bpm || 124, deckATrack?.key || '8A');

  const profileB: DynaMixProfile =
    (deckBTrack as any)?.dynamix ||
    estimateDynaMixProfile(deckBTrack?.duration || 210, deckBTrack?.bpm || 128, deckBTrack?.key || '8A');

  const strategy = calculateDynaMixTransitionStrategy(
    { bpm: deckATrack?.bpm || 124, key: deckATrack?.key, duration: deckATrack?.duration, dynamix: profileA },
    { bpm: deckBTrack?.bpm || 128, key: deckBTrack?.key, duration: deckBTrack?.duration, dynamix: profileB }
  );

  const formatSec = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
      <div className="w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-500 to-amber-500 text-black shadow-md">
              <Activity className="w-4 h-4 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide uppercase">
                  DynaMix Audio Transition & Energy Engine
                </span>
                <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[9px] rounded font-bold">
                  v2.0 · makalin/dynamix
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                RMS Energy Profiling, Optimal Mix-In / Drop Identification & Dancefloor Energy Flow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Transition Match Hero Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-cyan-500/30 bg-black">
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">
                  {strategy.energyMatchScore}%
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white uppercase">{strategy.strategyName}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      strategy.keyCompatibility === 'PERFECT'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : strategy.keyCompatibility === 'ENERGY_BOOST'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {strategy.keyCompatibility} HARMONIC MATCH
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-1">{strategy.recommendation}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 mt-1">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>DJ Technique: {strategy.djTechnique}</span>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Set Hot Cues Button */}
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              {onApplyCuesA && (
                <button
                  onClick={() => onApplyCuesA(profileA.cues)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Set Deck A Cues</span>
                </button>
              )}
              {onApplyCuesB && (
                <button
                  onClick={() => onApplyCuesB(profileB.cues)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Set Deck B Cues</span>
                </button>
              )}
            </div>
          </div>

          {/* Dual Deck Energy Profile Graphs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deck A Profile */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-cyan-500/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-xs font-black text-cyan-300 uppercase">DECK A ENERGY PROFILE</span>
                </div>
                {onOpenLocalFileA && (
                  <button
                    onClick={onOpenLocalFileA}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] flex items-center gap-1 border border-neutral-700"
                  >
                    <FolderOpen className="w-3 h-3 text-cyan-400" />
                    <span>Load Local</span>
                  </button>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-white truncate">{deckATrack?.title || 'No Track Loaded'}</p>
                <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                  <span>{deckATrack?.artist || 'Unknown'}</span>
                  <span>•</span>
                  <span>{deckATrack?.bpm || 124} BPM</span>
                  <span>•</span>
                  <span>Key: {deckATrack?.key || '8A'}</span>
                  <span>•</span>
                  <span className="text-cyan-400 font-bold">Avg Energy: {profileA.averageEnergy}%</span>
                </div>
              </div>

              {/* Energy Curve Bar Visualizer */}
              <div className="h-16 flex items-end gap-1 bg-black/60 p-2 rounded-lg border border-neutral-800">
                {profileA.energyPoints.map((val, idx) => (
                  <div
                    key={`a-slice-${idx}`}
                    className="flex-1 bg-gradient-to-t from-cyan-600 to-cyan-300 rounded-t transition-all"
                    style={{ height: `${Math.round(val * 100)}%` }}
                    title={`Slice ${idx + 1}: ${Math.round(val * 100)}% RMS`}
                  />
                ))}
              </div>

              {/* Cues Grid */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                <div className="bg-black/40 p-1 rounded border border-neutral-800">
                  <span className="text-neutral-500 block">INTRO</span>
                  <span className="font-bold text-cyan-300">{formatSec(profileA.cues.intro)}</span>
                </div>
                <div className="bg-black/40 p-1 rounded border border-neutral-800">
                  <span className="text-neutral-500 block">DROP</span>
                  <span className="font-bold text-red-400">{formatSec(profileA.cues.drop)}</span>
                </div>
                <div className="bg-black/40 p-1 rounded border border-neutral-800">
                  <span className="text-neutral-500 block">BREAK</span>
                  <span className="font-bold text-purple-300">{formatSec(profileA.cues.breakdown)}</span>
                </div>
                <div className="bg-black/40 p-1 rounded border border-neutral-800">
                  <span className="text-neutral-500 block">OUTRO</span>
                  <span className="font-bold text-emerald-400">{formatSec(profileA.cues.outro)}</span>
                </div>
              </div>
            </div>

            {/* Deck B Profile */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-amber-500/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-black text-amber-300 uppercase">DECK B ENERGY PROFILE</span>
                </div>
                {onOpenLocalFileB && (
                  <button
                    onClick={onOpenLocalFileB}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] flex items-center gap-1 border border-neutral-700"
                  >
                    <FolderOpen className="w-3 h-3 text-amber-400" />
                    <span>Load Local</span>
                  </button>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-white truncate">{deckBTrack?.title || 'No Track Loaded'}</p>
                <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                  <span>{deckBTrack?.artist || 'Unknown'}</span>
                  <span>•</span>
                  <span>{deckBTrack?.bpm || 128} BPM</span>
                  <span>•</span>
                  <span>Key: {deckBTrack?.key || '8A'}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">Avg Energy: {profileB.averageEnergy}%</span>
                </div>
              </div>

              {/* Energy Curve Bar Visualizer */}
              <div className="h-16 flex items-end gap-1 bg-black/60 p-2 rounded-lg border border-neutral-800">
                {profileB.energyPoints.map((val, idx) => (
                  <div
                    key={`b-slice-${idx}`}
                    className="flex-1 bg-gradient-to-t from-amber-600 to-amber-300 rounded-t transition-all"
                    style={{ height: `${Math.round(val * 100)}%` }}
                    title={`Slice ${idx + 1}: ${Math.round(val * 100)}% RMS`}
                  />
                ))}
              </div>

              {/* Cues Grid */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                <div className="bg-black/40 p-1 rounded border border-neutral-800">
                  <span className="text-neutral-500 block">INTRO</span>
                  <span className="font-bold text-amber-300">{formatSec(profileB.cues.intro)}</span>
                </div>
                <div className="bg-black/40 p-1 rounded border border-neutral-800">
                  <span className="text-neutral-500 block">DROP</span>
                  <span className="font-bold text-red-400">{formatSec(profileB.cues.drop)}</span>
                </div>
                <div className="bg-black/40 p-1 rounded border border-neutral-800">
                  <span className="text-neutral-500 block">BREAK</span>
                  <span className="font-bold text-purple-300">{formatSec(profileB.cues.breakdown)}</span>
                </div>
                <div className="bg-black/40 p-1 rounded border border-neutral-800">
                  <span className="text-neutral-500 block">OUTRO</span>
                  <span className="font-bold text-emerald-400">{formatSec(profileB.cues.outro)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between text-xs text-neutral-400">
          <span>DynaMix Transition Intelligence · Dancefloor Energy Flow Analysis</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
