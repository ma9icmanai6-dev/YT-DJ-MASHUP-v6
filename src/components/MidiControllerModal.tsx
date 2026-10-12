import React, { useState } from 'react';
import { ControllerDevice, DjActionKey } from '../services/controller';
import { Sliders, Gamepad2, Disc, X, RefreshCw, Radio, Check, Sparkles } from 'lucide-react';

interface MidiControllerModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: ControllerDevice[];
  onStartLearn: (action: DjActionKey) => void;
  learningAction: DjActionKey | null;
  onResetMappings: () => void;
}

const ACTION_LABELS: { key: DjActionKey; label: string; group: 'Mixer' | 'Deck A' | 'Deck B' | 'FX' }[] = [
  { key: 'crossfader', label: 'Crossfader (Channel Blend)', group: 'Mixer' },
  { key: 'masterVolume', label: 'Master Output Volume', group: 'Mixer' },

  { key: 'deckA_play', label: 'Deck A Play / Pause', group: 'Deck A' },
  { key: 'deckA_cue', label: 'Deck A CUE', group: 'Deck A' },
  { key: 'deckA_sync', label: 'Deck A Beat SYNC', group: 'Deck A' },
  { key: 'deckA_volume', label: 'Deck A Volume Fader', group: 'Deck A' },
  { key: 'deckA_filter', label: 'Deck A High/Low Filter', group: 'Deck A' },
  { key: 'deckA_hotcue1', label: 'Deck A Hot Cue 1', group: 'Deck A' },
  { key: 'deckA_hotcue2', label: 'Deck A Hot Cue 2', group: 'Deck A' },
  { key: 'deckA_hotcue3', label: 'Deck A Hot Cue 3', group: 'Deck A' },
  { key: 'deckA_hotcue4', label: 'Deck A Hot Cue 4', group: 'Deck A' },

  { key: 'deckB_play', label: 'Deck B Play / Pause', group: 'Deck B' },
  { key: 'deckB_cue', label: 'Deck B CUE', group: 'Deck B' },
  { key: 'deckB_sync', label: 'Deck B Beat SYNC', group: 'Deck B' },
  { key: 'deckB_volume', label: 'Deck B Volume Fader', group: 'Deck B' },
  { key: 'deckB_filter', label: 'Deck B High/Low Filter', group: 'Deck B' },
  { key: 'deckB_hotcue1', label: 'Deck B Hot Cue 1', group: 'Deck B' },
  { key: 'deckB_hotcue2', label: 'Deck B Hot Cue 2', group: 'Deck B' },
  { key: 'deckB_hotcue3', label: 'Deck B Hot Cue 3', group: 'Deck B' },
  { key: 'deckB_hotcue4', label: 'Deck B Hot Cue 4', group: 'Deck B' },

  { key: 'fxOn', label: 'OpenMix Beat FX On / Off', group: 'FX' },
  { key: 'fxLevel', label: 'FX Wet/Dry Level Knob', group: 'FX' },
  { key: 'airhorn', label: 'Airhorn Pad Stab', group: 'FX' },
];

export const MidiControllerModal: React.FC<MidiControllerModalProps> = ({
  isOpen,
  onClose,
  devices,
  onStartLearn,
  learningAction,
  onResetMappings,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<'All' | 'Mixer' | 'Deck A' | 'Deck B' | 'FX'>('All');

  if (!isOpen) return null;

  const filtered = selectedGroup === 'All'
    ? ACTION_LABELS
    : ACTION_LABELS.filter((a) => a.group === selectedGroup);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-mono font-bold text-white uppercase">
                  Hardware Controller & MIDI Mapping
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  OpenMix Engine
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400">
                Plug-and-play Pioneer DDJ controllers, USB MIDI platters, and Gamepads
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Status Bar */}
        <div className="px-4 py-3 bg-neutral-950/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-neutral-300 font-bold">
              Detected Hardware:
            </span>
            {devices.length === 0 ? (
              <span className="text-xs font-mono text-neutral-500">
                No external controller plugged in (Pioneer DDJ, USB MIDI, or Gamepad auto-detected upon connection)
              </span>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {devices.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/40 text-emerald-300"
                  >
                    {d.type === 'gamepad' ? <Gamepad2 className="w-3 h-3" /> : <Disc className="w-3 h-3" />}
                    <span>{d.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onResetMappings}
            className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
            title="Reset to factory Pioneer DDJ-400 / FLX4 mapping"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Factory Mapping</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-3 border-b border-neutral-800 bg-neutral-900/50">
          {(['All', 'Mixer', 'Deck A', 'Deck B', 'FX'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedGroup(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                selectedGroup === tab
                  ? 'bg-neutral-800 text-cyan-400 border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Mapping Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {learningAction && (
            <div className="p-3 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/50 text-amber-300 text-xs font-mono flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>
                  <strong>MIDI LEARN ACTIVE:</strong> Touch or move a knob/fader/pad on your controller to bind to{' '}
                  <span className="text-white font-bold">{learningAction}</span>
                </span>
              </div>
              <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-black">
                LISTENING...
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((item) => {
              const isLearningThis = learningAction === item.key;
              return (
                <div
                  key={item.key}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isLearningThis
                      ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-mono font-bold text-white block truncate">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      Default: Pioneer DDJ / MIDI CC
                    </span>
                  </div>

                  <button
                    onClick={() => onStartLearn(item.key)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition-all shrink-0 ${
                      isLearningThis
                        ? 'bg-amber-500 text-black animate-pulse'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700'
                    }`}
                  >
                    {isLearningThis ? 'Move Control' : 'Learn'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
          <span>
            Pioneer DDJ-400, DDJ-FLX4, DDJ-FLX6, DDJ-200, Numark, Hercules & Gamepads are supported natively.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
