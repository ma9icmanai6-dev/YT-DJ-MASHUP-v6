import React, { useState } from 'react';
import { MixxxEffectUnit, MixxxFxType } from '../types/dj';
import { audioFx } from '../services/audioFx';
import { Zap, Sliders, Waves, Activity, X, RotateCcw, Sparkles } from 'lucide-react';

interface MixxxEffectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bpmA: number;
  bpmB: number;
}

const MIXXX_FX_DESCRIPTIONS: Record<MixxxFxType, { name: string; desc: string; p1: string; p2: string; p3: string }> = {
  filter: {
    name: 'Biquad Resonant Filter',
    desc: 'Mixxx 4-pole state-variable ladder filter with variable resonance and slope',
    p1: 'Cutoff Freq',
    p2: 'Resonance Q',
    p3: 'Drive Warmth',
  },
  echo: {
    name: 'Tempo-Synced Echo',
    desc: 'Tape-style feedback delay with highpass damping and ping-pong division',
    p1: 'Beat Division',
    p2: 'Feedback Decay',
    p3: 'High Damping',
  },
  flanger: {
    name: 'Stereo Jet Flanger',
    desc: 'LFO modulated comb delay line with negative feedback inversion',
    p1: 'LFO Rate',
    p2: 'Sweep Depth',
    p3: 'Regeneration',
  },
  reverb: {
    name: 'Concert Hall Reverb',
    desc: 'Stereo plate & arena impulse matrix with room decay and dampening',
    p1: 'Room Size',
    p2: 'Decay Time',
    p3: 'Damping',
  },
  bitcrusher: {
    name: 'BitCrusher & Decimator',
    desc: 'Digital lo-fi downsampler with sample rate reduction and bit reduction',
    p1: 'Bit Depth',
    p2: 'Decimation',
    p3: 'Anti-Alias',
  },
  phaser: {
    name: 'Multi-Stage Phaser',
    desc: '4-stage allpass cascade phase shifter with stereo quadrature sweep',
    p1: 'Mod Speed',
    p2: 'Phase Depth',
    p3: 'Resonance',
  },
  autopan: {
    name: 'Stereo Autopan',
    desc: 'Stereo panorama LFO tremolo with tempo-synchronized beat division',
    p1: 'Pan Speed',
    p2: 'Stereo Width',
    p3: 'LFO Shape',
  },
  distortion: {
    name: 'Tube Overdrive & Saturator',
    desc: 'Analog-modeled soft-clipping wave shaper with harmonic overdrive',
    p1: 'Drive Gain',
    p2: 'Harmonics',
    p3: 'Tone Cut',
  },
};

export const MixxxEffectsModal: React.FC<MixxxEffectsModalProps> = ({
  isOpen,
  onClose,
  bpmA,
  bpmB,
}) => {
  // 3 Mixxx Modular Effect Units (Unit 1: Deck A, Unit 2: Deck B, Unit 3: Master)
  const [units, setUnits] = useState<MixxxEffectUnit[]>([
    {
      id: 'unit1',
      name: 'EFFECT UNIT 1',
      assignedTo: 'A',
      enabled: false,
      fxType: 'echo',
      dryWet: 50,
      superKnob: 60,
      param1: 50,
      param2: 65,
      param3: 40,
    },
    {
      id: 'unit2',
      name: 'EFFECT UNIT 2',
      assignedTo: 'B',
      enabled: false,
      fxType: 'flanger',
      dryWet: 50,
      superKnob: 50,
      param1: 40,
      param2: 70,
      param3: 50,
    },
    {
      id: 'unitMaster',
      name: 'MASTER FX UNIT',
      assignedTo: 'Master',
      enabled: false,
      fxType: 'filter',
      dryWet: 60,
      superKnob: 50,
      param1: 50,
      param2: 60,
      param3: 30,
    },
  ]);

  if (!isOpen) return null;

  const handleUpdateUnit = (idx: number, updates: Partial<MixxxEffectUnit>) => {
    setUnits((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...updates };
      return next;
    });
  };

  const handleToggleUnit = (idx: number) => {
    const unit = units[idx];
    const nextEnabled = !unit.enabled;
    handleUpdateUnit(idx, { enabled: nextEnabled });

    // Trigger audioFx preview / burst
    const targetBpm = unit.assignedTo === 'B' ? bpmB : bpmA;
    audioFx.setFxBpm(targetBpm);
    audioFx.setFxType(unit.fxType as any);
    audioFx.setFxLevel((unit.dryWet / 100) * (unit.superKnob / 100));
    audioFx.toggleFx(nextEnabled);
  };

  const handleTriggerQuickBurst = (idx: number) => {
    const unit = units[idx];
    const targetBpm = unit.assignedTo === 'B' ? bpmB : bpmA;
    audioFx.setFxBpm(targetBpm);
    audioFx.setFxType(unit.fxType as any);
    audioFx.setFxLevel((unit.dryWet / 100) * (unit.superKnob / 100));
    audioFx.triggerBeatFx();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col p-4 sm:p-6 gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-mono font-black text-white tracking-wider uppercase">
                  MIXXX BUILT-IN EFFECTS SUITE
                </h2>
                <span className="px-1.5 py-0.2 rounded bg-purple-950/70 border border-purple-500/40 text-[10px] font-mono text-purple-300 font-bold">
                  MIXXX 2.4 DSP
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400">
                Modular 3-Rack Multi-Effects Engine with Super Knob macro modulation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Modular Effect Units Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {units.map((unit, idx) => {
            const fxMeta = MIXXX_FX_DESCRIPTIONS[unit.fxType];
            const channelBadge =
              unit.assignedTo === 'A'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : unit.assignedTo === 'B'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/50';

            return (
              <div
                key={unit.id}
                className={`bg-neutral-900/90 border rounded-xl p-3 flex flex-col gap-3 transition-all ${
                  unit.enabled
                    ? 'border-purple-500/70 shadow-lg shadow-purple-500/10'
                    : 'border-neutral-800'
                }`}
              >
                {/* Unit Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-black text-white">{unit.name}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${channelBadge}`}>
                      {unit.assignedTo === 'Master' ? 'MASTER' : `DECK ${unit.assignedTo}`}
                    </span>
                  </div>

                  {/* Channel Assignment Toggle */}
                  <select
                    value={unit.assignedTo}
                    onChange={(e) => handleUpdateUnit(idx, { assignedTo: e.target.value as any })}
                    className="bg-neutral-950 border border-neutral-700 text-neutral-300 text-[10px] font-mono rounded px-1 py-0.5"
                  >
                    <option value="A">Deck A</option>
                    <option value="B">Deck B</option>
                    <option value="Master">Master</option>
                  </select>
                </div>

                {/* Effect Algorithm Selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                    DSP ALGORITHM:
                  </label>
                  <select
                    value={unit.fxType}
                    onChange={(e) => handleUpdateUnit(idx, { fxType: e.target.value as MixxxFxType })}
                    className="w-full bg-neutral-950 border border-neutral-700 text-white text-xs font-mono rounded-lg p-1.5 font-bold focus:border-purple-400"
                  >
                    {Object.entries(MIXXX_FX_DESCRIPTIONS).map(([typeKey, meta]) => (
                      <option key={typeKey} value={typeKey}>
                        {meta.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] font-mono text-neutral-400 italic line-clamp-1">
                    {fxMeta.desc}
                  </span>
                </div>

                {/* Main Macro Controls: DRY/WET & SUPER KNOB */}
                <div className="grid grid-cols-2 gap-2 bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-2.5">
                  {/* DRY / WET Slider */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                      DRY / WET
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={unit.dryWet}
                      onChange={(e) => handleUpdateUnit(idx, { dryWet: parseInt(e.target.value, 10) })}
                      className="w-full accent-purple-400 cursor-pointer h-2 bg-neutral-800 rounded-lg"
                    />
                    <span className="text-[10px] font-mono text-purple-300 font-bold">{unit.dryWet}%</span>
                  </div>

                  {/* SUPER KNOB (Mixxx Signature Macro Control) */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>SUPER KNOB</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={unit.superKnob}
                      onChange={(e) => handleUpdateUnit(idx, { superKnob: parseInt(e.target.value, 10) })}
                      className="w-full accent-amber-400 cursor-pointer h-2 bg-neutral-800 rounded-lg"
                    />
                    <span className="text-[10px] font-mono text-amber-300 font-bold">{unit.superKnob}%</span>
                  </div>
                </div>

                {/* 3 Detailed Mixxx Effect Parameters */}
                <div className="flex flex-col gap-1.5 bg-neutral-950/50 p-2 rounded-lg border border-neutral-800/60">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                    <span>{fxMeta.p1}</span>
                    <span className="text-white font-bold">{unit.param1}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={unit.param1}
                    onChange={(e) => handleUpdateUnit(idx, { param1: parseInt(e.target.value, 10) })}
                    className="w-full accent-neutral-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />

                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mt-1">
                    <span>{fxMeta.p2}</span>
                    <span className="text-white font-bold">{unit.param2}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={unit.param2}
                    onChange={(e) => handleUpdateUnit(idx, { param2: parseInt(e.target.value, 10) })}
                    className="w-full accent-neutral-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />

                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mt-1">
                    <span>{fxMeta.p3}</span>
                    <span className="text-white font-bold">{unit.param3}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={unit.param3}
                    onChange={(e) => handleUpdateUnit(idx, { param3: parseInt(e.target.value, 10) })}
                    className="w-full accent-neutral-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                </div>

                {/* Action Controls: Unit ON / OFF & Quick Burst Pad */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleToggleUnit(idx)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-black border transition-all active:scale-95 shadow-sm ${
                      unit.enabled
                        ? 'bg-purple-500 text-black border-purple-400 shadow-purple-500/30'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    {unit.enabled ? 'FX ACTIVE' : 'FX OFF'}
                  </button>

                  <button
                    onClick={() => handleTriggerQuickBurst(idx)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-purple-300 border border-neutral-700 text-xs font-mono font-bold active:scale-95"
                    title="Trigger instantaneous beat-synced FX burst"
                  >
                    BURST
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Footer Info */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs font-mono text-neutral-400">
          <span>Mixxx Open Source DJ FX Engine (BPM Synced · Deck A: {bpmA.toFixed(1)} / Deck B: {bpmB.toFixed(1)})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
