import React, { useState } from 'react';
import { LEGENDARY_FX_CHAINS, FaderFxChain } from '../services/faderFxChains';
import { audioFx } from '../services/audioFx';
import { Zap, Sliders, Waves, Activity, X, RotateCcw, Sparkles, Volume2, ArrowRight } from 'lucide-react';

interface FaderFxModalProps {
  isOpen: boolean;
  onClose: () => void;
  bpmA: number;
  bpmB: number;
}

export const FaderFxModal: React.FC<FaderFxModalProps> = ({
  isOpen,
  onClose,
  bpmA,
  bpmB,
}) => {
  if (!isOpen) return null;

  const [activeChainId, setActiveChainId] = useState<string>('detox');
  const [assignedDeck, setAssignedDeck] = useState<'A' | 'B' | 'Master'>('A');
  const [superKnob, setSuperKnob] = useState<number>(65); // 0 to 100
  const [isEngaged, setIsEngaged] = useState<boolean>(false);

  const chain = LEGENDARY_FX_CHAINS[activeChainId] || LEGENDARY_FX_CHAINS.detox;

  const handleTriggerBurst = () => {
    const effectiveBpm = assignedDeck === 'B' ? bpmB : bpmA;
    audioFx.setFxBpm(effectiveBpm);
    audioFx.triggerFaderFx(chain.id, superKnob / 100);
  };

  const handleToggleEngaged = () => {
    const next = !isEngaged;
    setIsEngaged(next);
    if (next) {
      handleTriggerBurst();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none">
      <div className="w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500 to-cyan-500 text-black shadow-md">
              <Zap className="w-4 h-4 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide uppercase">
                  Fader FX & 3-Slot MacroFX Chains
                </span>
                <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] rounded font-bold">
                  Ean Golden Fader FX Theory (2008) · Pioneer SoundColorFX
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Chain 3 Base Effects: [Slot 1: Repeating] + [Slot 2: Shaping] + [Slot 3: Dimensional]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Target Assignment */}
            <div className="flex items-center gap-1 bg-black p-0.5 rounded-lg border border-neutral-800 text-[10px]">
              <span className="text-neutral-500 px-1 font-bold">ASSIGN:</span>
              {(['A', 'B', 'Master'] as const).map((target) => (
                <button
                  key={target}
                  onClick={() => setAssignedDeck(target)}
                  className={`px-2 py-0.5 rounded font-black transition-all ${
                    assignedDeck === target
                      ? target === 'A'
                        ? 'bg-cyan-500 text-black'
                        : target === 'B'
                        ? 'bg-amber-500 text-black'
                        : 'bg-purple-500 text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {target === 'Master' ? 'MASTER' : `DECK ${target}`}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Preset Selector Grid */}
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
              Select Legendary FX Chain Preset:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Object.values(LEGENDARY_FX_CHAINS).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChainId(c.id);
                    audioFx.triggerFaderFx(c.id, superKnob / 100);
                  }}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    activeChainId === c.id
                      ? 'bg-purple-600/25 border-purple-400 text-white shadow-lg shadow-purple-950/50'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <span className="text-[9px] text-purple-400 block font-black uppercase tracking-wider">
                    {c.origin}
                  </span>
                  <span className="text-xs font-bold block truncate">{c.name.split(' (')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Chain Details & 3-Slot Architecture Display */}
          <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-black text-purple-400 uppercase tracking-wide">
                  {chain.name}
                </span>
                <p className="text-[11px] text-neutral-300 font-sans mt-0.5">{chain.description}</p>
                <span className="text-[10px] text-amber-400 font-sans mt-0.5 block">
                  Best Used For: {chain.bestUsedFor}
                </span>
              </div>

              {/* Master SuperKnob Controller */}
              <div className="flex items-center gap-3 bg-black/70 p-2.5 rounded-xl border border-purple-500/40">
                <div className="text-right">
                  <span className="text-[10px] font-black text-purple-300 block">SUPERKNOB</span>
                  <span className="text-xs font-black text-white">{superKnob}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={superKnob}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setSuperKnob(val);
                    if (isEngaged) {
                      audioFx.triggerFaderFx(chain.id, val / 100);
                    }
                  }}
                  className="w-28 h-2 accent-purple-400 cursor-pointer bg-neutral-800 rounded"
                />
                <button
                  onClick={handleTriggerBurst}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-black text-xs font-black shadow-md active:scale-95 transition-all"
                  title="Trigger momentary 3-slot FX burst"
                >
                  BURST
                </button>
                <button
                  onClick={handleToggleEngaged}
                  className={`px-3 py-1 rounded-lg text-xs font-black border transition-all ${
                    isEngaged
                      ? 'bg-emerald-500 text-black border-emerald-400 animate-pulse'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                  }`}
                >
                  {isEngaged ? 'HOLD ON' : 'HOLD FX'}
                </button>
              </div>
            </div>

            {/* 3 Interactive Slots */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-neutral-800">
              {/* Slot 1: Repeating */}
              <div className="p-3 rounded-lg bg-black/60 border border-cyan-500/40 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                    SLOT 1: REPEATING
                  </span>
                  <span className="text-[9px] text-neutral-500 uppercase">{chain.slot1.category}</span>
                </div>
                <span className="text-xs font-black text-white">{chain.slot1.name}</span>
                <p className="text-[10px] text-neutral-400 font-sans">{chain.slot1.description}</p>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all"
                    style={{ width: `${Math.round(superKnob * chain.slot1.defaultSetting)}%` }}
                  />
                </div>
              </div>

              {/* Slot 2: Shaping */}
              <div className="p-3 rounded-lg bg-black/60 border border-purple-500/40 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                    SLOT 2: SHAPING
                  </span>
                  <span className="text-[9px] text-neutral-500 uppercase">{chain.slot2.category}</span>
                </div>
                <span className="text-xs font-black text-white">{chain.slot2.name}</span>
                <p className="text-[10px] text-neutral-400 font-sans">{chain.slot2.description}</p>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-purple-400 rounded-full transition-all"
                    style={{ width: `${Math.round(superKnob * chain.slot2.defaultSetting)}%` }}
                  />
                </div>
              </div>

              {/* Slot 3: Dimensional */}
              <div className="p-3 rounded-lg bg-black/60 border border-amber-500/40 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                    SLOT 3: DIMENSIONAL
                  </span>
                  <span className="text-[9px] text-neutral-500 uppercase">{chain.slot3.category}</span>
                </div>
                <span className="text-xs font-black text-white">{chain.slot3.name}</span>
                <p className="text-[10px] text-neutral-400 font-sans">{chain.slot3.description}</p>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${Math.round(superKnob * chain.slot3.defaultSetting)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between text-xs text-neutral-400">
          <span>Ean Golden 3-Slot Fader FX Architecture · Real-time DSP Synthesis</span>
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
