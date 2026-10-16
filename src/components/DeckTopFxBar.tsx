import React, { useState } from 'react';
import { OpenMixFxType, audioFx } from '../services/audioFx';
import { Zap, Play } from 'lucide-react';

interface DeckTopFxBarProps {
  deckId: 'A' | 'B';
  effectiveBpm: number;
  accentColor: 'cyan' | 'orange';
  onOpenFaderFx?: () => void;
}

const DECK_FX_LIST: { id: OpenMixFxType; label: string; short: string }[] = [
  { id: 'echo', label: 'ECHO', short: 'Echo' },
  { id: 'reverb', label: 'REVERB', short: 'Verb' },
  { id: 'flanger', label: 'FLANGER', short: 'Flange' },
  { id: 'phaser', label: 'PHASER', short: 'Phase' },
  { id: 'crush', label: 'CRUSH', short: 'Crush' },
  { id: 'trans', label: 'TRANS', short: 'Gate' },
  { id: 'filter', label: 'SWEEP', short: 'Sweep' },
  { id: 'robot', label: 'ROBOT', short: 'Robot' },
];

const FADER_FX_COMBOS = [
  { id: 'detox', label: 'DETOX' },
  { id: 'build', label: 'BUILD' },
  { id: 'swirl', label: 'SWIRL' },
  { id: 'dubecho', label: 'DUB ECHO' },
  { id: 'noisesweep', label: 'NOISE' },
];

export const DeckTopFxBar: React.FC<DeckTopFxBarProps> = ({
  deckId,
  effectiveBpm,
  accentColor,
  onOpenFaderFx,
}) => {
  const [selectedFx, setSelectedFx] = useState<OpenMixFxType>('echo');
  const [isFxOn, setIsFxOn] = useState<boolean>(false);
  const [beatDiv, setBeatDiv] = useState<number>(0.5);
  const [level, setLevel] = useState<number>(70);

  const isCyan = accentColor === 'cyan';
  const activeFxBg = isCyan ? 'bg-cyan-500 text-black shadow-cyan-500/30' : 'bg-amber-500 text-black shadow-amber-500/30';
  const buttonBorder = isCyan ? 'border-cyan-500/40 text-cyan-300' : 'border-amber-500/40 text-amber-300';

  const handleSelect = (fx: OpenMixFxType) => {
    setSelectedFx(fx);
    audioFx.setFxType(fx);
  };

  const handleToggle = () => {
    const next = !isFxOn;
    setIsFxOn(next);
    audioFx.setFxType(selectedFx);
    audioFx.setFxBpm(effectiveBpm);
    audioFx.setFxLevel(level / 100);
    audioFx.setFxBeatDiv(beatDiv);
    audioFx.toggleFx(next);
  };

  const handleBurst = () => {
    audioFx.setFxType(selectedFx);
    audioFx.setFxBpm(effectiveBpm);
    audioFx.setFxLevel(level / 100);
    audioFx.setFxBeatDiv(beatDiv);
    audioFx.triggerBeatFx();
  };

  return (
    <div className="w-full bg-neutral-950/50 backdrop-blur-[1px] border border-neutral-800/80 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-inner">
      {/* Label & Active FX status */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border flex items-center gap-1 ${
          isFxOn ? `${activeFxBg} animate-pulse shadow-md` : `bg-neutral-950 ${buttonBorder}`
        }`}>
          <Zap className="w-3 h-3 fill-current" />
          <span>DECK {deckId} FX</span>
        </div>

        {onOpenFaderFx && (
          <button
            onClick={onOpenFaderFx}
            className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-black border border-purple-500/40 transition-all shadow-sm flex items-center gap-1"
            title="Open 3-Slot Fader FX & MacroFX Suite"
          >
            <span>3-SLOT FADER FX</span>
          </button>
        )}
      </div>

      {/* FX Selector Buttons + Fader FX Combos */}
      <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
        {DECK_FX_LIST.map((fx) => (
          <button
            key={fx.id}
            onClick={() => handleSelect(fx.id)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all shrink-0 ${
              selectedFx === fx.id
                ? isCyan
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 font-black'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400 font-black'
                : 'bg-neutral-950/80 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            {fx.label}
          </button>
        ))}

        <div className="w-px h-4 bg-neutral-800 mx-1 shrink-0" />

        {FADER_FX_COMBOS.map((combo) => (
          <button
            key={combo.id}
            onClick={() => {
              audioFx.setFxBpm(effectiveBpm);
              audioFx.triggerFaderFx(combo.id, level / 100);
            }}
            className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-950/40 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-800/60 transition-all shrink-0"
            title={`Trigger ${combo.label} 3-slot combo`}
          >
            {combo.label}
          </button>
        ))}
      </div>

      {/* Beat divisions, Level & Trigger buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Beat multiplier */}
        <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10px] font-mono">
          {[0.25, 0.5, 1, 2].map((div) => (
            <button
              key={div}
              onClick={() => {
                setBeatDiv(div);
                audioFx.setFxBeatDiv(div);
              }}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                beatDiv === div
                  ? isCyan
                    ? 'bg-cyan-500 text-black'
                    : 'bg-amber-500 text-black'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {div === 0.25 ? '¼' : div === 0.5 ? '½' : `${div}x`}
            </button>
          ))}
        </div>

        {/* Level */}
        <div className="flex items-center gap-1 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
          <span className="text-[9px] font-mono text-neutral-500">LVL</span>
          <input
            type="range"
            min={0}
            max={100}
            value={level}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setLevel(v);
              audioFx.setFxLevel(v / 100);
            }}
            className="w-12 h-1 accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Big FX ON / BURST button */}
        <button
          onClick={handleToggle}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border transition-all active:scale-95 ${
            isFxOn
              ? `${activeFxBg} shadow-md animate-pulse`
              : `bg-neutral-950 ${buttonBorder} hover:bg-neutral-800`
          }`}
          title="Toggle Beat FX for this deck"
        >
          {isFxOn ? 'ON' : 'FX'}
        </button>

        <button
          onClick={handleBurst}
          className="p-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white"
          title="Trigger instantaneous FX drop burst"
        >
          <Play className="w-2.5 h-2.5 fill-current" />
        </button>
      </div>
    </div>
  );
};
