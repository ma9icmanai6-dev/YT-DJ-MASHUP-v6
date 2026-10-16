/**
 * Fader FX & 3-Slot MacroFX Chains
 * Based on Ean Golden's Fader FX Theory (2008), Pioneer SoundColorFX, and Traktor MacroFX
 *
 * 3-Slot Architecture:
 * - Slot 1: Repeating effect (Beatmasher, Gater, Delays)
 * - Slot 2: Shaping effect (Filter, Lo-Fi / Bitcrush, Peak Filter, Formant)
 * - Slot 3: Dimensional effect (Reverb, Tape Delay, Flanger)
 */

export interface FxSlotDefinition {
  type: 'repeating' | 'shaping' | 'dimensional';
  name: string;
  category: 'delay' | 'echo' | 'reverb' | 'flanger' | 'filter' | 'overdrive' | 'pitch' | 'resonator' | 'modulation' | 'compression' | 'gate' | 'crush' | 'noise';
  defaultSetting: number; // 0 to 1
  description: string;
}

export interface FaderFxChain {
  id: string;
  name: string;
  origin: 'DJTT Ean Golden' | 'Pioneer DJM' | 'Traktor Pro' | 'VirtualDJ';
  description: string;
  slot1: FxSlotDefinition;
  slot2: FxSlotDefinition;
  slot3: FxSlotDefinition;
  superKnobBehavior: string;
  bestUsedFor: string;
}

export const LEGENDARY_FX_CHAINS: Record<string, FaderFxChain> = {
  detox: {
    id: 'detox',
    name: 'Detox (Ean Golden)',
    origin: 'DJTT Ean Golden',
    description: 'Beatmasher2 into Lo-Fi bitcrush into Resonant Peak Filter',
    slot1: {
      type: 'repeating',
      name: 'BeatMasher 2',
      category: 'gate',
      defaultSetting: 0.6,
      description: 'Buffer stutter sampler that captures and loops audio slices',
    },
    slot2: {
      type: 'shaping',
      name: 'Digital Lo-Fi',
      category: 'crush',
      defaultSetting: 0.2,
      description: 'Bit resolution downsampler with harmonic grit',
    },
    slot3: {
      type: 'dimensional',
      name: 'Peak Filter',
      category: 'resonator',
      defaultSetting: 0.4,
      description: 'Narrow-Q resonant bell filter emphasizing key frequencies',
    },
    superKnobBehavior: 'Simultaneously mashes beat slices, crushes sample rate, and sweeps resonant peak',
    bestUsedFor: 'Breakdowns, live remixing, tension creation before drop',
  },

  build: {
    id: 'build',
    name: 'Build (Ean Golden)',
    origin: 'DJTT Ean Golden',
    description: 'BPM Gater into BeatMasher2 into High-Q Peak Filter',
    slot1: {
      type: 'repeating',
      name: 'Time Gater',
      category: 'gate',
      defaultSetting: 0.5,
      description: 'Square-wave tempo-synced gate that chops audio into 1/8 and 1/16 pulses',
    },
    slot2: {
      type: 'shaping',
      name: 'BeatMasher 2',
      category: 'gate',
      defaultSetting: 0.35,
      description: 'Accelerating beat slicer',
    },
    slot3: {
      type: 'dimensional',
      name: 'Peak Filter',
      category: 'resonator',
      defaultSetting: 0.45,
      description: 'Rising resonance sweep',
    },
    superKnobBehavior: 'Accelerates chop rate while sweeping resonant filter upward to drop',
    bestUsedFor: 'Pre-drop buildup, rising excitement, snare roll climaxes',
  },

  swirl: {
    id: 'swirl',
    name: 'Swirl (Ean Golden)',
    origin: 'DJTT Ean Golden',
    description: 'FlangerFlux into Resonant Filter LFO into Concert Reverb',
    slot1: {
      type: 'repeating',
      name: 'Flanger Flux',
      category: 'flanger',
      defaultSetting: 0.5,
      description: 'LFO modulated comb delay line with feedback swirl',
    },
    slot2: {
      type: 'shaping',
      name: 'Ladder Filter LFO',
      category: 'filter',
      defaultSetting: 0.4,
      description: 'State-variable resonant filter with sine modulation',
    },
    slot3: {
      type: 'dimensional',
      name: 'Concert Reverb',
      category: 'reverb',
      defaultSetting: 0.6,
      description: 'High-density stereo plate reverb with expansive acoustic tail',
    },
    superKnobBehavior: 'Opens flanger phase sweep while expanding reverb tail into an ethereal cloud',
    bestUsedFor: 'Vocal transitions, melodic washouts, harmonic blends',
  },

  wormhole: {
    id: 'wormhole',
    name: 'Wormhole (MacroFX)',
    origin: 'Traktor Pro',
    description: 'Heavy Resonant Filter + Jet Flanger + High-Feedback Delay',
    slot1: {
      type: 'repeating',
      name: 'Tape Delay',
      category: 'delay',
      defaultSetting: 0.6,
      description: 'Analog tape saturation delay with wow & flutter',
    },
    slot2: {
      type: 'shaping',
      name: 'Heavy Biquad Filter',
      category: 'filter',
      defaultSetting: 0.7,
      description: 'Deep resonant bandpass sweep',
    },
    slot3: {
      type: 'dimensional',
      name: 'Jet Flanger',
      category: 'flanger',
      defaultSetting: 0.75,
      description: 'Aggressive comb feedback phase cancellation',
    },
    superKnobBehavior: 'Sucks track into a swirling audio vortex and releases with huge delay tail',
    bestUsedFor: 'Genre switches, quick transition cuts, sudden drops',
  },

  polarwind: {
    id: 'polarwind',
    name: 'Polar Wind (MacroFX)',
    origin: 'Traktor Pro',
    description: 'Heavy Flanger Coloring + Light Sweep Filter + Shimmer Reverb',
    slot1: {
      type: 'repeating',
      name: 'Sub-Bass Pulse',
      category: 'modulation',
      defaultSetting: 0.4,
      description: 'Subtle low-frequency oscillation',
    },
    slot2: {
      type: 'shaping',
      name: 'Soft Color Filter',
      category: 'filter',
      defaultSetting: 0.35,
      description: 'Warm high-shelf and low-cut shading',
    },
    slot3: {
      type: 'dimensional',
      name: 'Shimmer Iceverb',
      category: 'reverb',
      defaultSetting: 0.7,
      description: 'Glacial stereo reverb with crystalline high frequencies',
    },
    superKnobBehavior: 'Freezes track in an icy ambient reverb wash while sweeping high frequencies',
    bestUsedFor: 'Punch-in mixing, outro transitions, deep house & techno blends',
  },

  laserslicer: {
    id: 'laserslicer',
    name: 'Laser Slicer',
    origin: 'DJTT Ean Golden',
    description: 'Heavy Beatmasher + Pitch Modulation + Jet Flanger',
    slot1: {
      type: 'repeating',
      name: 'Laser Beatmasher',
      category: 'gate',
      defaultSetting: 0.7,
      description: 'High-frequency triplet stutter buffer',
    },
    slot2: {
      type: 'shaping',
      name: 'Pitch Ramp Shaper',
      category: 'pitch',
      defaultSetting: 0.6,
      description: 'Downward pitch dive curve',
    },
    slot3: {
      type: 'dimensional',
      name: 'Stereo Flanger',
      category: 'flanger',
      defaultSetting: 0.5,
      description: 'Wide stereo phase widening',
    },
    superKnobBehavior: 'Slices audio into laser zaps with escalating pitch bends',
    bestUsedFor: 'EDM builds, dubstep laser stabs, energetic drops',
  },

  darkmatter: {
    id: 'darkmatter',
    name: 'Dark Matter (MacroFX)',
    origin: 'Traktor Pro',
    description: 'Heavy Decimator Bitcrush + Dotted Delay + Brickwall Compression',
    slot1: {
      type: 'repeating',
      name: 'Dotted Delay',
      category: 'delay',
      defaultSetting: 0.55,
      description: 'Staccato 3/16 dotted note bounce delay',
    },
    slot2: {
      type: 'shaping',
      name: 'Industrial Bitcrush',
      category: 'crush',
      defaultSetting: 0.65,
      description: 'Heavy 4-bit downsampling and clipping saturation',
    },
    slot3: {
      type: 'dimensional',
      name: 'Slam Compressor',
      category: 'compression',
      defaultSetting: 0.8,
      description: 'Fast-attack punch limiter bringing up low-level grit',
    },
    superKnobBehavior: 'Crushes dynamic range into an aggressive industrial distortion wall',
    bestUsedFor: 'Peak-time techno, aggressive mashup punch-ins',
  },

  eventhorizon: {
    id: 'eventhorizon',
    name: 'Event Horizon',
    origin: 'DJTT Ean Golden',
    description: 'Heavy Resonant Highpass Filter + High-Feedback Ping-Pong Echo',
    slot1: {
      type: 'repeating',
      name: 'Ping-Pong Echo',
      category: 'echo',
      defaultSetting: 0.65,
      description: 'Stereo alternating 1/2 beat echo with 70% decay feedback',
    },
    slot2: {
      type: 'shaping',
      name: 'Resonant HPF',
      category: 'filter',
      defaultSetting: 0.75,
      description: 'Cuts bass below 600Hz with high resonant peak',
    },
    slot3: {
      type: 'dimensional',
      name: 'Cosmic Reverb',
      category: 'reverb',
      defaultSetting: 0.5,
      description: 'Deep interstellar diffusion tail',
    },
    superKnobBehavior: 'Strips bass cleanly while echoing track out into infinity',
    bestUsedFor: 'Quick exit transitions: spin knob to 100% and drop the other deck',
  },

  dubecho: {
    id: 'dubecho',
    name: 'Dub Echo (SoundColorFX)',
    origin: 'Pioneer DJM',
    description: 'Pioneer DJM-900NXS2 Dub Echo with pitch modulation and highpass feedback',
    slot1: {
      type: 'repeating',
      name: 'Dub Delay',
      category: 'echo',
      defaultSetting: 0.6,
      description: '3/4 beat tape echo with self-oscillating feedback',
    },
    slot2: {
      type: 'shaping',
      name: 'Bandpass Damping',
      category: 'filter',
      defaultSetting: 0.5,
      description: 'High-cut and low-cut warm tube character',
    },
    slot3: {
      type: 'dimensional',
      name: 'Dub Space',
      category: 'reverb',
      defaultSetting: 0.45,
      description: 'Reggae dub chamber ambience',
    },
    superKnobBehavior: 'Center is dry. Turning right increases echo feedback and highpass sweep.',
    bestUsedFor: 'Snare dubbing, vocal echoes, reggae / dub / house transition fills',
  },

  noisesweep: {
    id: 'noisesweep',
    name: 'Noise Sweep (SoundColorFX)',
    origin: 'Pioneer DJM',
    description: 'Pioneer DJM-900NXS2 Noise generator + bidirectional sweep filter',
    slot1: {
      type: 'repeating',
      name: 'White Noise Generator',
      category: 'noise',
      defaultSetting: 0.6,
      description: 'Internally synthesized white noise oscillator',
    },
    slot2: {
      type: 'shaping',
      name: 'Bi-directional Filter',
      category: 'filter',
      defaultSetting: 0.5,
      description: 'Turn left for Low-Pass filter; turn right for High-Pass filter',
    },
    slot3: {
      type: 'dimensional',
      name: 'Noise Reverb Tail',
      category: 'reverb',
      defaultSetting: 0.4,
      description: 'Stereo spatial tail for the noise riser',
    },
    superKnobBehavior: 'Injects white noise and sweeps filter from deep rumble to sizzling high riser',
    bestUsedFor: 'Drop anticipation, buildup risers, filling empty track transitions',
  },

  spiralup: {
    id: 'spiralup',
    name: 'Spiral Pitch Up (RMX-1000)',
    origin: 'Pioneer DJM',
    description: 'Pioneer RMX-1000 Spiral Up: raises pitch of echo while changing reverberation time',
    slot1: {
      type: 'repeating',
      name: 'Pitch Echo',
      category: 'echo',
      defaultSetting: 0.7,
      description: 'Accelerating delay line',
    },
    slot2: {
      type: 'shaping',
      name: 'Ascending Pitch Shifter',
      category: 'pitch',
      defaultSetting: 0.75,
      description: 'Continuous chromatic upward pitch transposition (+12 semitones)',
    },
    slot3: {
      type: 'dimensional',
      name: 'Diffusion Chamber',
      category: 'reverb',
      defaultSetting: 0.6,
      description: 'Rising shimmer reverb tail',
    },
    superKnobBehavior: 'Spirals the sound upward into a crescendo of rising pitch harmonics',
    bestUsedFor: 'High-energy EDM buildups, climactic drop insertions',
  },
};
