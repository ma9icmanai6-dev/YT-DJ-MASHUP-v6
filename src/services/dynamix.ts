/**
 * DynaMix: Audio Transition Analysis & Energy-Flow Mixing Strategy Engine
 * Based on DynaMix (https://github.com/makalin/dynamix)
 * 
 * Extracts musical features (RMS energy profile, BPM, musical key)
 * and determines optimal mixing points to maintain dancefloor energy flow during transitions.
 */

export interface DynaMixCuePoints {
  intro: number;      // Mix-In point (seconds)
  drop: number;       // Peak dancefloor energy drop point (seconds)
  breakdown: number;  // Harmonic bridge / vocal breakdown window (seconds)
  outro: number;      // Mix-Out transition cue point (seconds)
}

export interface DynaMixProfile {
  energyPoints: number[];     // Normalized 0 to 1 RMS energy across 32 time slices
  averageEnergy: number;      // 0 to 100%
  peakEnergy: number;         // 0 to 100%
  energyRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM_DROP';
  cues: DynaMixCuePoints;
  detectedKey: string;        // e.g. "8A / A minor"
}

export interface TransitionStrategy {
  strategyName: string;
  energyMatchScore: number;   // 0 to 100%
  keyCompatibility: 'PERFECT' | 'COMPATIBLE' | 'ENERGY_BOOST' | 'CLASH';
  keyCamelotDelta: number;
  recommendation: string;
  optimalMixInTimeA: number;
  optimalDropTimeB: number;
  djTechnique: string;
}

/**
 * Analyzes decoded Web Audio buffer to generate DynaMix RMS energy profile and cue points
 */
export function analyzeAudioBufferForDynaMix(audioBuffer: AudioBuffer): DynaMixProfile {
  const duration = audioBuffer.duration;
  const numSlices = 32;
  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;
  const samplesPerSlice = Math.floor(totalSamples / numSlices);

  const rawRms: number[] = [];
  let maxRms = 0.0001;

  for (let s = 0; s < numSlices; s++) {
    const start = s * samplesPerSlice;
    const end = Math.min(start + samplesPerSlice, totalSamples);
    let sumSq = 0;
    // Step by 4 for fast client-side computation
    for (let i = start; i < end; i += 4) {
      const v = channelData[i];
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / ((end - start) / 4));
    rawRms.push(rms);
    if (rms > maxRms) maxRms = rms;
  }

  // Normalize RMS energy curve 0 to 1
  const energyPoints = rawRms.map((r) => Math.min(1, Math.max(0.05, r / maxRms)));

  // Calculate average & peak
  const sum = energyPoints.reduce((a, b) => a + b, 0);
  const avg = sum / energyPoints.length;
  const averageEnergy = Math.round(avg * 100);
  const peakEnergy = Math.round(Math.max(...energyPoints) * 100);

  // Identify optimal mixing points:
  // 1. Intro: first slice that exceeds 35% of max energy (or 8% into song)
  let introSlice = 1;
  for (let s = 0; s < Math.floor(numSlices * 0.3); s++) {
    if (energyPoints[s] >= 0.35) {
      introSlice = s;
      break;
    }
  }

  // 2. Peak / Drop: slice with maximum energy (prefer between 20% and 75% of song)
  let dropSlice = Math.floor(numSlices * 0.4);
  let highest = 0;
  for (let s = Math.floor(numSlices * 0.15); s < Math.floor(numSlices * 0.75); s++) {
    if (energyPoints[s] > highest) {
      highest = energyPoints[s];
      dropSlice = s;
    }
  }

  // 3. Breakdown: minimum energy valley in the middle section
  let breakSlice = Math.floor(numSlices * 0.55);
  let lowest = 1.0;
  for (let s = Math.floor(numSlices * 0.45); s < Math.floor(numSlices * 0.75); s++) {
    if (energyPoints[s] < lowest) {
      lowest = energyPoints[s];
      breakSlice = s;
    }
  }

  // 4. Outro: energy drop towards the end (last 25% of track)
  let outroSlice = Math.floor(numSlices * 0.85);
  for (let s = Math.floor(numSlices * 0.75); s < numSlices - 1; s++) {
    if (energyPoints[s] <= avg * 0.8) {
      outroSlice = s;
      break;
    }
  }

  const sliceDuration = duration / numSlices;
  const cues: DynaMixCuePoints = {
    intro: Math.round(introSlice * sliceDuration),
    drop: Math.round(dropSlice * sliceDuration),
    breakdown: Math.round(breakSlice * sliceDuration),
    outro: Math.round(outroSlice * sliceDuration),
  };

  const energyRating: DynaMixProfile['energyRating'] =
    averageEnergy > 75 ? 'MAXIMUM_DROP' : averageEnergy > 55 ? 'HIGH' : averageEnergy > 35 ? 'MEDIUM' : 'LOW';

  return {
    energyPoints,
    averageEnergy,
    peakEnergy,
    energyRating,
    cues,
    detectedKey: '8A', // Standard Camelot default
  };
}

/**
 * Generate synthetic DynaMix profile if track is streaming from YouTube/Archive
 */
export function estimateDynaMixProfile(duration: number, bpm: number, seedKey: string = '8A'): DynaMixProfile {
  const numSlices = 32;
  const dur = duration > 0 ? duration : 210;
  const energyPoints: number[] = [];

  // Generate characteristic dance track energy profile:
  // Build-up intro -> drop 1 -> breakdown bridge -> drop 2 (peak) -> outro decay
  for (let s = 0; s < numSlices; s++) {
    const progress = s / numSlices;
    let energy = 0.3;
    if (progress < 0.12) {
      // Intro
      energy = 0.25 + progress * 2.5;
    } else if (progress < 0.35) {
      // Drop 1
      energy = 0.8 + Math.sin(progress * 20) * 0.15;
    } else if (progress < 0.55) {
      // Breakdown / vocal bridge
      energy = 0.4 + Math.sin(progress * 15) * 0.1;
    } else if (progress < 0.8) {
      // Main Drop 2 (Peak)
      energy = 0.95 + Math.sin(progress * 25) * 0.05;
    } else {
      // Outro
      energy = Math.max(0.2, 0.9 - (progress - 0.8) * 3.5);
    }
    energyPoints.push(Math.min(1, Math.max(0.1, energy)));
  }

  const sum = energyPoints.reduce((a, b) => a + b, 0);
  const averageEnergy = Math.round((sum / energyPoints.length) * 100);

  return {
    energyPoints,
    averageEnergy,
    peakEnergy: 98,
    energyRating: averageEnergy > 65 ? 'HIGH' : 'MEDIUM',
    cues: {
      intro: Math.round(dur * 0.08),
      drop: Math.round(dur * 0.22),
      breakdown: Math.round(dur * 0.48),
      outro: Math.round(dur * 0.82),
    },
    detectedKey: seedKey,
  };
}

/**
 * Compares two tracks and generates optimal transition strategy to maintain dancefloor energy
 */
export function calculateDynaMixTransitionStrategy(
  trackA: { bpm: number; key?: string; duration?: number; dynamix?: DynaMixProfile },
  trackB: { bpm: number; key?: string; duration?: number; dynamix?: DynaMixProfile }
): TransitionStrategy {
  const profileA = trackA.dynamix || estimateDynaMixProfile(trackA.duration || 180, trackA.bpm, trackA.key);
  const profileB = trackB.dynamix || estimateDynaMixProfile(trackB.duration || 180, trackB.bpm, trackB.key);

  const energyDelta = profileB.averageEnergy - profileA.averageEnergy;
  const bpmDelta = Math.abs(trackA.bpm - trackB.bpm);

  // Key compatibility check
  const keyA = trackA.key || '8A';
  const keyB = trackB.key || '8A';
  const numA = parseInt(keyA, 10) || 8;
  const numB = parseInt(keyB, 10) || 8;
  const keyDiff = Math.abs(numA - numB);

  let keyCompatibility: TransitionStrategy['keyCompatibility'] = 'COMPATIBLE';
  if (keyA === keyB) keyCompatibility = 'PERFECT';
  else if (keyDiff === 1 || keyDiff === 11) keyCompatibility = 'ENERGY_BOOST';
  else if (keyDiff > 2 && keyDiff < 10) keyCompatibility = 'CLASH';

  // Calculate score (0-100)
  let score = 90;
  if (bpmDelta > 8) score -= 15;
  if (keyCompatibility === 'CLASH') score -= 20;
  else if (keyCompatibility === 'PERFECT') score += 10;
  score = Math.min(100, Math.max(50, score));

  // Determine transition technique
  let strategyName = 'Harmonic Energy Flow';
  let recommendation = `Begin blending Deck B at Track A breakdown (${formatSec(profileA.cues.breakdown)})`;
  let djTechnique = 'Harmonic EQ Swap: Swap Low frequency bass on Beat 1 of the drop.';

  if (energyDelta > 15) {
    strategyName = 'Energy Escalation (+15% Dancefloor Boost)';
    recommendation = `High-impact cut: trigger Deck B Peak Drop directly as Deck A reaches outro.`;
    djTechnique = 'Power Drop: Cut Deck A on downbeat 1 and release Deck B full throttle with 1/2 beat noise sweep.';
  } else if (energyDelta < -15) {
    strategyName = 'Smooth Breakdown De-escalation';
    recommendation = `Gentle blend: engage 3-slot Fader FX (Swirl or PolarWind) on Deck A before bringing Deck B intro.`;
    djTechnique = 'Filter Fadeout: Sweep Deck A High-Pass Filter while bringing Deck B Lows up over 16 bars.';
  } else if (keyCompatibility === 'PERFECT') {
    strategyName = 'Perfect Harmonic Mashup Blend';
    recommendation = `Both tracks share identical musical key (${keyA}). Layer Deck B vocals over Deck A instrumental.`;
    djTechnique = 'Stem Fusion: Mute Deck A vocals, Solo Deck B acapella over Deck A drums & bass.';
  }

  return {
    strategyName,
    energyMatchScore: score,
    keyCompatibility,
    keyCamelotDelta: keyDiff,
    recommendation,
    optimalMixInTimeA: profileA.cues.breakdown,
    optimalDropTimeB: profileB.cues.drop,
    djTechnique,
  };
}

function formatSec(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
