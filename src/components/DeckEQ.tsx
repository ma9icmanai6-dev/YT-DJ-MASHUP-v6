import React, { useState } from 'react';
import { NeuralMixStems } from '../types/dj';
import { Mic, Disc3, Music2, Sparkles, SlidersHorizontal, Layers, RotateCcw } from 'lucide-react';

interface DeckEQProps {
  eq: {
    high: number;
    mid: number;
    low: number;
  };
  eqKill: {
    high: boolean;
    mid: boolean;
    low: boolean;
  };
  filter: number;
  gain?: number; // -12 to +12 dB preamp boost
  onChangeEQ: (band: 'high' | 'mid' | 'low', val: number) => void;
  onToggleKill: (band: 'high' | 'mid' | 'low') => void;
  onChangeFilter: (val: number) => void;
  onChangeGain?: (gainDb: number) => void;
  accentColor: 'cyan' | 'orange';
  neuralMix?: NeuralMixStems;
  onChangeNeuralMix?: (stems: NeuralMixStems) => void;
}

interface KnobProps {
  label: string;
  value: number; // -100 to 100 or 0 to 100
  onChange: (val: number) => void;
  isKilled?: boolean;
  accent: 'cyan' | 'orange' | 'amber' | 'pink' | 'emerald' | 'purple';
  unit?: string;
  min?: number;
  max?: number;
}

const Knob: React.FC<KnobProps> = ({
  label,
  value,
  onChange,
  isKilled,
  accent,
  min = -100,
  max = 100,
}) => {
  // Normalize angle between min and max
  const range = max - min;
  const normalized = (value - min) / range; // 0 to 1
  const angle = -135 + normalized * 270; // -135 to +135 deg

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const startY = e.clientY;
    const startVal = value;

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const deltaY = startY - moveEvt.clientY; // upward drag increases value
      const step = range / 120;
      const newVal = Math.max(min, Math.min(max, Math.round(startVal + deltaY * step)));
      onChange(newVal);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? (range / 20) : -(range / 20);
    onChange(Math.max(min, Math.min(max, Math.round(value + delta))));
  };

  const handleDoubleClick = () => {
    // Reset to center detent (0 for -100..100, or 100 for 0..100)
    onChange(min < 0 ? 0 : max);
  };

  const accentPointer =
    accent === 'cyan'
      ? 'bg-cyan-400 shadow-cyan-400/50'
      : accent === 'orange'
      ? 'bg-amber-400 shadow-amber-400/50'
      : accent === 'pink'
      ? 'bg-pink-400 shadow-pink-400/50'
      : accent === 'emerald'
      ? 'bg-emerald-400 shadow-emerald-400/50'
      : accent === 'purple'
      ? 'bg-purple-400 shadow-purple-400/50'
      : 'bg-amber-400 shadow-amber-400/50';

  const displayDb =
    min < 0
      ? value === 0
        ? '0'
        : value > 0
        ? `+${(value * 0.06).toFixed(1)}`
        : `${(value * 0.26).toFixed(1)}`
      : `${value}%`;

  return (
    <div className="flex flex-col items-center select-none" onWheel={handleWheel}>
      <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase mb-1 font-semibold">
        {label}
      </span>

      {/* Rotary Knob Chassis */}
      <div
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full relative bg-gradient-to-b from-neutral-800 to-neutral-950 border border-neutral-700 cursor-ns-resize shadow-md flex items-center justify-center transition-transform active:scale-95 touch-none ${
          isKilled ? 'opacity-30' : ''
        }`}
        title={`${label}: ${value} (Drag up/down, scroll, or double-click to reset)`}
      >
        {/* Bezel ring */}
        <div className="absolute inset-1 rounded-full border border-neutral-700/50 pointer-events-none" />

        {/* Center rotating pointer */}
        <div
          className="w-full h-full rounded-full relative flex items-center justify-center pointer-events-none"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className={`absolute top-1 w-1 h-2.5 rounded-full ${accentPointer} shadow-sm`} />
        </div>

        {/* Top detent notch */}
        <div className="absolute -top-1 w-0.5 h-1 bg-neutral-600 rounded-full pointer-events-none" />
      </div>

      {/* Value readout */}
      <span
        className={`text-[9px] font-mono mt-1 ${
          isKilled ? 'text-red-400 font-bold' : value === 0 && min < 0 ? 'text-neutral-500' : 'text-neutral-300'
        }`}
      >
        {isKilled ? 'KILL' : min < 0 ? `${displayDb}dB` : displayDb}
      </span>
    </div>
  );
};

export const DeckEQ: React.FC<DeckEQProps> = ({
  eq,
  eqKill,
  filter,
  gain = 6,
  onChangeEQ,
  onToggleKill,
  onChangeFilter,
  onChangeGain,
  accentColor,
  neuralMix,
  onChangeNeuralMix,
}) => {
  const [activeTab, setActiveTab] = useState<'eq' | 'neural'>('neural');
  const accent = accentColor === 'cyan' ? 'cyan' : 'orange';

  // Default neural mix stems state
  const stems: NeuralMixStems = neuralMix || {
    vocals: 100,
    drums: 100,
    instruments: 100,
    vocalMute: false,
    drumMute: false,
    instrumentMute: false,
    soloStem: null,
  };

  const handleUpdateStem = (stem: 'vocals' | 'drums' | 'instruments', val: number) => {
    if (!onChangeNeuralMix) return;
    onChangeNeuralMix({
      ...stems,
      [stem]: val,
    });
  };

  const handleToggleMuteStem = (stem: 'vocals' | 'drums' | 'instruments') => {
    if (!onChangeNeuralMix) return;
    const muteKey = stem === 'vocals' ? 'vocalMute' : stem === 'drums' ? 'drumMute' : 'instrumentMute';
    onChangeNeuralMix({
      ...stems,
      [muteKey]: !stems[muteKey],
      soloStem: null,
    });
  };

  const handleSoloStem = (stem: 'vocals' | 'drums' | 'instruments') => {
    if (!onChangeNeuralMix) return;
    const isAlreadySolo = stems.soloStem === stem;
    if (isAlreadySolo) {
      // Unsolo -> reset all mutes
      onChangeNeuralMix({
        ...stems,
        soloStem: null,
        vocalMute: false,
        drumMute: false,
        instrumentMute: false,
      });
    } else {
      // Solo this stem
      onChangeNeuralMix({
        ...stems,
        soloStem: stem,
        vocalMute: stem !== 'vocals',
        drumMute: stem !== 'drums',
        instrumentMute: stem !== 'instruments',
      });
    }
  };

  const handleResetNeuralMix = () => {
    if (!onChangeNeuralMix) return;
    onChangeNeuralMix({
      vocals: 100,
      drums: 100,
      instruments: 100,
      vocalMute: false,
      drumMute: false,
      instrumentMute: false,
      soloStem: null,
    });
  };

  return (
    <div className="bg-neutral-950/75 p-2.5 sm:p-3 rounded-xl border border-neutral-800/80 shadow-inner flex flex-col gap-2 select-none">
      {/* Tab Switcher: 3-BAND EQ vs NEURAL MIX AI STEMS */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-1.5 gap-2">
        <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg text-[10px] font-mono">
          <button
            onClick={() => setActiveTab('neural')}
            className={`px-2 py-0.5 rounded-md font-black flex items-center gap-1 transition-all ${
              activeTab === 'neural'
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Neural Mix Technology: Real-time AI Stems separation (Vocals, Drums, Instruments)"
          >
            <Sparkles className="w-3 h-3 text-pink-200" />
            <span>NEURAL MIX™</span>
          </button>
          <button
            onClick={() => setActiveTab('eq')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all ${
              activeTab === 'eq'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Standard 3-Band Isolator EQ & Filter"
          >
            3-BAND EQ
          </button>
        </div>

        {activeTab === 'neural' ? (
          <button
            onClick={handleResetNeuralMix}
            className="text-[9px] font-mono text-neutral-400 hover:text-pink-300 transition-colors uppercase flex items-center gap-1"
            title="Reset all stem faders & mutes to 100%"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>RESET</span>
          </button>
        ) : (
          <button
            onClick={() => {
              onChangeEQ('high', 0);
              onChangeEQ('mid', 0);
              onChangeEQ('low', 0);
              onChangeFilter(0);
            }}
            className="text-[9px] font-mono text-neutral-400 hover:text-neutral-200 transition-colors uppercase"
            title="Reset EQ & Filter to flat"
          >
            RESET FLAT
          </button>
        )}
      </div>

      {/* NEURAL MIX TECHNOLOGY STEM SEPARATION VIEW */}
      {activeTab === 'neural' && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2 items-start justify-items-center">
            {/* VOCALS STEM */}
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center gap-1 mb-0.5 text-[10px] font-mono font-bold text-pink-400">
                <Mic className="w-3 h-3" />
                <span>VOCAL</span>
              </div>
              <Knob
                label=""
                value={stems.vocals}
                min={0}
                max={100}
                isKilled={stems.vocalMute || (stems.soloStem !== null && stems.soloStem !== 'vocals')}
                onChange={(v) => handleUpdateStem('vocals', v)}
                accent="pink"
              />
              <div className="flex items-center gap-1 mt-1.5 w-full justify-center">
                <button
                  onClick={() => handleToggleMuteStem('vocals')}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors ${
                    stems.vocalMute
                      ? 'bg-red-500/30 text-red-400 border-red-500/80 shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                  title="Mute vocals"
                >
                  MUTE
                </button>
                <button
                  onClick={() => handleSoloStem('vocals')}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors ${
                    stems.soloStem === 'vocals'
                      ? 'bg-pink-500 text-black border-pink-400 shadow-sm'
                      : 'bg-neutral-900 text-pink-400 border-neutral-800 hover:border-pink-500/50'
                  }`}
                  title="Solo vocals (instant Acapella!)"
                >
                  SOLO
                </button>
              </div>
            </div>

            {/* DRUMS STEM */}
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center gap-1 mb-0.5 text-[10px] font-mono font-bold text-cyan-400">
                <Disc3 className="w-3 h-3" />
                <span>DRUMS</span>
              </div>
              <Knob
                label=""
                value={stems.drums}
                min={0}
                max={100}
                isKilled={stems.drumMute || (stems.soloStem !== null && stems.soloStem !== 'drums')}
                onChange={(v) => handleUpdateStem('drums', v)}
                accent="cyan"
              />
              <div className="flex items-center gap-1 mt-1.5 w-full justify-center">
                <button
                  onClick={() => handleToggleMuteStem('drums')}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors ${
                    stems.drumMute
                      ? 'bg-red-500/30 text-red-400 border-red-500/80 shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                  title="Mute drums"
                >
                  MUTE
                </button>
                <button
                  onClick={() => handleSoloStem('drums')}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors ${
                    stems.soloStem === 'drums'
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                      : 'bg-neutral-900 text-cyan-400 border-neutral-800 hover:border-cyan-500/50'
                  }`}
                  title="Solo drums (instant Beat / Rhythm loop!)"
                >
                  SOLO
                </button>
              </div>
            </div>

            {/* INSTRUMENTS STEM */}
            <div className="flex flex-col items-center w-full">
              <div className="flex items-center gap-1 mb-0.5 text-[10px] font-mono font-bold text-emerald-400">
                <Music2 className="w-3 h-3" />
                <span>HARMONIC</span>
              </div>
              <Knob
                label=""
                value={stems.instruments}
                min={0}
                max={100}
                isKilled={stems.instrumentMute || (stems.soloStem !== null && stems.soloStem !== 'instruments')}
                onChange={(v) => handleUpdateStem('instruments', v)}
                accent="emerald"
              />
              <div className="flex items-center gap-1 mt-1.5 w-full justify-center">
                <button
                  onClick={() => handleToggleMuteStem('instruments')}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors ${
                    stems.instrumentMute
                      ? 'bg-red-500/30 text-red-400 border-red-500/80 shadow-sm'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                  title="Mute harmonic instruments"
                >
                  MUTE
                </button>
                <button
                  onClick={() => handleSoloStem('instruments')}
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border transition-colors ${
                    stems.soloStem === 'instruments'
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                      : 'bg-neutral-900 text-emerald-400 border-neutral-800 hover:border-emerald-500/50'
                  }`}
                  title="Solo instruments (instant backing track!)"
                >
                  SOLO
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stem Presets Bar */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-800/60 text-[9px] font-mono">
            <button
              onClick={() => handleSoloStem('vocals')}
              className="flex-1 py-1 px-1 rounded bg-pink-950/40 hover:bg-pink-900/50 text-pink-300 border border-pink-500/40 font-bold transition-all text-center"
              title="Instant Acapella Vocal Extraction"
            >
              🎤 ACAPELLA
            </button>
            <button
              onClick={() => handleSoloStem('drums')}
              className="flex-1 py-1 px-1 rounded bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-500/40 font-bold transition-all text-center"
              title="Instant Drum & Percussion Loop"
            >
              🥁 DRUM LOOP
            </button>
            <button
              onClick={() => handleSoloStem('instruments')}
              className="flex-1 py-1 px-1 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40 font-bold transition-all text-center"
              title="Instant Instrumental Track (Remove Vocals)"
            >
              🎹 INST
            </button>
          </div>
        </div>
      )}

      {/* STANDARD 3-BAND ISOLATOR EQ & COLOR FILTER VIEW */}
      {activeTab === 'eq' && (
        <div className="grid grid-cols-4 gap-2 items-start justify-items-center">
          {/* HIGH / TREBLE */}
          <div className="flex flex-col items-center">
            <Knob
              label="HI"
              value={eq.high}
              isKilled={eqKill.high}
              onChange={(v) => onChangeEQ('high', v)}
              accent={accent}
            />
            <button
              onClick={() => onToggleKill('high')}
              className={`mt-1.5 px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                eqKill.high
                  ? 'bg-red-500/20 text-red-400 border-red-500/60 shadow-sm shadow-red-500/30'
                  : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'
              }`}
              title="Toggle High Kill"
            >
              KILL
            </button>
          </div>

          {/* MID */}
          <div className="flex flex-col items-center">
            <Knob
              label="MID"
              value={eq.mid}
              isKilled={eqKill.mid}
              onChange={(v) => onChangeEQ('mid', v)}
              accent={accent}
            />
            <button
              onClick={() => onToggleKill('mid')}
              className={`mt-1.5 px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                eqKill.mid
                  ? 'bg-red-500/20 text-red-400 border-red-500/60 shadow-sm shadow-red-500/30'
                  : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'
              }`}
              title="Toggle Mid Kill"
            >
              KILL
            </button>
          </div>

          {/* LOW / BASS */}
          <div className="flex flex-col items-center">
            <Knob
              label="LOW"
              value={eq.low}
              isKilled={eqKill.low}
              onChange={(v) => onChangeEQ('low', v)}
              accent={accent}
            />
            <button
              onClick={() => onToggleKill('low')}
              className={`mt-1.5 px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                eqKill.low
                  ? 'bg-red-500/20 text-red-400 border-red-500/60 shadow-sm shadow-red-500/30'
                  : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'
              }`}
              title="Toggle Bass Kill (Swap beat)"
            >
              KILL
            </button>
          </div>

          {/* FILTER LPF / HPF */}
          <div className="flex flex-col items-center">
            <Knob
              label="COLOR"
              value={filter}
              onChange={onChangeFilter}
              accent="amber"
            />
            <span className="mt-1.5 text-[9px] font-mono text-neutral-500">
              {filter === 0 ? 'LPF/HPF' : filter < 0 ? `LPF ${Math.abs(filter)}%` : `HPF ${filter}%`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
