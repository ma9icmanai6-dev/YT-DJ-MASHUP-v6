import React, { useState } from 'react';
import { OpenMixFxType, audioFx } from '../services/audioFx';
import { Zap, Activity, Waves, Volume2, Radio, Play } from 'lucide-react';

interface OpenMixFxRackProps {
  effectiveBpm: number;
}

const FX_OPTIONS: { id: OpenMixFxType; label: string; desc: string }[] = [
  { id: 'echo', label: 'ECHO', desc: 'Beat-synced feedback delay' },
  { id: 'reverb', label: 'REVERB', desc: 'Impulse stereo arena' },
  { id: 'flanger', label: 'FLANGER', desc: 'Jet-engine LFO sweep' },
  { id: 'phaser', label: 'PHASER', desc: '4-stage allpass cascade' },
  { id: 'crush', label: 'CRUSH', desc: 'Bitcrush & digital grit' },
  { id: 'trans', label: 'TRANS', desc: 'Rhythmic tempo gate' },
  { id: 'pan', label: 'PAN', desc: 'Stereo ping-pong sweep' },
  { id: 'robot', label: 'ROBOT', desc: 'Ring-mod robotic vocal' },
  { id: 'filter', label: 'SWEEP', desc: 'Resonant bandpass sweep' },
];

const BEAT_DIVS = [
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
  { label: '3/4', value: 0.75 },
  { label: '1', value: 1.0 },
  { label: '2', value: 2.0 },
];

export const OpenMixFxRack: React.FC<OpenMixFxRackProps> = ({ effectiveBpm }) => {
  const [selectedFx, setSelectedFx] = useState<OpenMixFxType>('echo');
  const [targetDeck, setTargetDeck] = useState<'A' | 'B' | 'Master'>('Master');
  const [selectedDiv, setSelectedDiv] = useState<number>(0.5);
  const [fxLevel, setFxLevel] = useState<number>(65);
  const [isFxOn, setIsFxOn] = useState<boolean>(false);

  const handleSelectFx = (fx: OpenMixFxType) => {
    setSelectedFx(fx);
    audioFx.setFxType(fx);
  };

  const handleToggleFx = () => {
    const next = !isFxOn;
    setIsFxOn(next);
    audioFx.setFxBpm(effectiveBpm);
    audioFx.setFxLevel(fxLevel / 100);
    audioFx.setFxBeatDiv(selectedDiv);
    audioFx.toggleFx(next);
  };

  const handleTriggerBurst = () => {
    audioFx.setFxBpm(effectiveBpm);
    audioFx.setFxLevel(fxLevel / 100);
    audioFx.setFxBeatDiv(selectedDiv);
    audioFx.triggerBeatFx();
  };

  const handleChangeLevel = (val: number) => {
    setFxLevel(val);
    audioFx.setFxLevel(val / 100);
  };

  const handleChangeDiv = (val: number) => {
    setSelectedDiv(val);
    audioFx.setFxBeatDiv(val);
  };

  return (
    <div className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 relative overflow-hidden">
      {/* Background neon ambient glow */}
      <div className="absolute top-0 right-0 w-72 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800/80 pb-2.5 gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/60 border border-purple-500/50 text-xs font-mono font-bold text-purple-300">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>OPENMIX BEAT FX RACK</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
            Tempo-synced DSP multi-effects unit ({effectiveBpm.toFixed(1)} BPM)
          </span>
        </div>

        {/* Channel Routing Selector */}
        <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 p-1 rounded-xl text-xs font-mono">
          <span className="text-neutral-500 text-[10px] uppercase font-bold px-1">ASSIGN:</span>
          {(['A', 'Master', 'B'] as const).map((tgt) => (
            <button
              key={tgt}
              onClick={() => setTargetDeck(tgt)}
              className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                targetDeck === tgt
                  ? tgt === 'A'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : tgt === 'B'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'bg-purple-500 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tgt === 'Master' ? 'MASTER' : `DECK ${tgt}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Controls Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 relative z-10">
        {/* FX Type Selector Buttons */}
        <div className="lg:col-span-7 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {FX_OPTIONS.map((fx) => {
            const isSelected = selectedFx === fx.id;
            return (
              <button
                key={fx.id}
                onClick={() => handleSelectFx(fx.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-md shadow-purple-900/30 ring-1 ring-purple-400'
                    : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white'
                }`}
                title={fx.desc}
              >
                <span className="text-xs font-mono font-black">{fx.label}</span>
                <span className="text-[9px] font-mono opacity-65 truncate w-full">{fx.desc.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Beat Timing Division Buttons */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-2 bg-neutral-900/60 border border-neutral-800 p-2.5 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>BEAT DIVISION</span>
            <span className="text-purple-400 font-bold">{selectedDiv}x Beat</span>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {BEAT_DIVS.map((div) => (
              <button
                key={div.value}
                onClick={() => handleChangeDiv(div.value)}
                className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  selectedDiv === div.value
                    ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {div.label}
              </button>
            ))}
          </div>

          {/* Level slider */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-mono text-neutral-400 shrink-0">LEVEL:</span>
            <input
              type="range"
              min={0}
              max={100}
              value={fxLevel}
              onChange={(e) => handleChangeLevel(parseInt(e.target.value, 10))}
              className="w-full accent-purple-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              title="Dry / Wet FX Output Level"
            />
            <span className="text-[10px] font-mono font-bold text-purple-300 w-8 text-right">
              {fxLevel}%
            </span>
          </div>
        </div>

        {/* Master FX Action Strobe & Trigger */}
        <div className="lg:col-span-2 flex sm:flex-col gap-2">
          {/* Main FX On / Off Toggle */}
          <button
            onClick={handleToggleFx}
            className={`flex-1 min-h-[50px] rounded-xl flex flex-col items-center justify-center font-mono font-black text-xs tracking-wider uppercase border transition-all active:scale-95 shadow-lg ${
              isFxOn
                ? 'bg-purple-600 text-white border-purple-300 shadow-purple-600/50 animate-pulse'
                : 'bg-neutral-900 border-purple-500/40 text-purple-300 hover:bg-neutral-800'
            }`}
            title="Toggle Beat FX loop on current channel"
          >
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-current" />
              <span>{isFxOn ? 'FX LIVE' : 'BEAT FX'}</span>
            </div>
            <span className="text-[9px] font-normal opacity-80">
              {isFxOn ? 'ON AIR' : 'ARMED'}
            </span>
          </button>

          {/* Instant Beat FX Burst */}
          <button
            onClick={handleTriggerBurst}
            className="flex-1 min-h-[40px] rounded-xl flex items-center justify-center gap-1.5 font-mono font-bold text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-500 text-neutral-200 transition-all active:scale-95"
            title="Trigger an instantaneous FX drop burst"
          >
            <Play className="w-3.5 h-3.5 fill-current text-purple-400" />
            <span>BURST</span>
          </button>
        </div>
      </div>
    </div>
  );
};
