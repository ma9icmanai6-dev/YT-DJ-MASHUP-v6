/**
 * Pro DJ Audio FX Synthesizer & OpenMix DSP Effects Unit
 * Integrated from OpenMix (https://github.com/blackmagic42/openmix)
 */

export type OpenMixFxType =
  | 'echo'
  | 'reverb'
  | 'flanger'
  | 'phaser'
  | 'crush'
  | 'trans'
  | 'pan'
  | 'robot'
  | 'filter';

function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function crushCurve(steps: number): Float32Array {
  const n = 2048;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve as any;
}

class AudioFxEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  // OpenMix FX Rack Nodes
  private fxActive: boolean = false;
  private currentFx: OpenMixFxType = 'echo';
  private fxLevel: number = 0.5; // 0 to 1
  private fxBpm: number = 124;
  private fxBeatDiv: number = 0.5; // 1/2 beat default
  private fxMasterGain: GainNode | null = null;
  private fxActiveOsc: OscillatorNode | null = null;
  private fxInterval: NodeJS.Timeout | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public setFxBpm(bpm: number) {
    this.fxBpm = Math.max(40, Math.min(220, bpm));
  }

  public setFxType(type: OpenMixFxType) {
    this.currentFx = type;
  }

  public setFxLevel(level: number) {
    this.fxLevel = Math.max(0, Math.min(1, level));
  }

  public setFxBeatDiv(div: number) {
    this.fxBeatDiv = div;
  }

  public isFxOn(): boolean {
    return this.fxActive;
  }

  /**
   * OpenMix Beat FX Trigger / Stutter Burst
   */
  public triggerBeatFx() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const beatSec = (60 / this.fxBpm) * this.fxBeatDiv;

    const fxGain = ctx.createGain();
    fxGain.gain.setValueAtTime(this.volume * this.fxLevel * 0.7, now);
    fxGain.connect(ctx.destination);

    switch (this.currentFx) {
      case 'echo': {
        // Highpass filtered feedback echo burst
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

        const delay = ctx.createDelay(2);
        delay.delayTime.value = beatSec;
        const fb = ctx.createGain();
        fb.gain.value = 0.55 * this.fxLevel;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 240;

        delay.connect(hp);
        hp.connect(fb);
        fb.connect(delay);
        delay.connect(fxGain);

        osc.connect(delay);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }
      case 'reverb': {
        // Shimmering ambient space blast
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

        const conv = ctx.createConvolver();
        conv.buffer = makeImpulse(ctx, 2.5, 2.2);
        osc.connect(conv);
        conv.connect(fxGain);

        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }
      case 'flanger': {
        // Jet flanger sweep
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(600, now + beatSec * 2);

        const delay = ctx.createDelay(0.05);
        delay.delayTime.setValueAtTime(0.003, now);
        delay.delayTime.linearRampToValueAtTime(0.012, now + beatSec * 2);

        osc.connect(delay);
        delay.connect(fxGain);

        osc.start(now);
        osc.stop(now + beatSec * 2);
        break;
      }
      case 'phaser': {
        // 4-stage phaser sweep
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        const fil = ctx.createBiquadFilter();
        fil.type = 'allpass';
        fil.frequency.setValueAtTime(400, now);
        fil.frequency.exponentialRampToValueAtTime(1800, now + beatSec);

        osc.connect(fil);
        fil.connect(fxGain);
        osc.start(now);
        osc.stop(now + beatSec);
        break;
      }
      case 'crush': {
        // Bitcrush / 8-bit grit stab
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        const shaper = ctx.createWaveShaper();
        (shaper as any).curve = crushCurve(4);

        osc.connect(shaper);
        shaper.connect(fxGain);
        osc.start(now);
        osc.stop(now + beatSec);
        break;
      }
      case 'trans': {
        // Rhythmic gate stutter pulse
        for (let i = 0; i < 4; i++) {
          const t = now + (i * beatSec) / 4;
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = 300;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.3, t);
          g.gain.linearRampToValueAtTime(0.001, t + beatSec / 8);
          osc.connect(g);
          g.connect(fxGain);
          osc.start(t);
          osc.stop(t + beatSec / 8);
        }
        break;
      }
      case 'pan': {
        // Stereo ping pong sweep
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        if (ctx.createStereoPanner) {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(-0.9, now);
          panner.pan.linearRampToValueAtTime(0.9, now + beatSec);
          osc.connect(panner);
          panner.connect(fxGain);
        } else {
          osc.connect(fxGain);
        }
        osc.start(now);
        osc.stop(now + beatSec);
        break;
      }
      case 'robot': {
        // Ring modulation robot vocal
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        const mod = ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.setValueAtTime(35, now);
        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(0.8, now);

        mod.connect(modGain.gain);
        osc.connect(modGain);
        modGain.connect(fxGain);

        mod.start(now);
        osc.start(now);
        mod.stop(now + beatSec);
        osc.stop(now + beatSec);
        break;
      }
      case 'filter': {
        // Resonant highpass / lowpass filter sweep
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 4.5;
        bp.frequency.setValueAtTime(300, now);
        bp.frequency.exponentialRampToValueAtTime(3200, now + beatSec);

        osc.connect(bp);
        bp.connect(fxGain);
        osc.start(now);
        osc.stop(now + beatSec);
        break;
      }
    }
  }

  public toggleFx(enable?: boolean) {
    this.fxActive = enable !== undefined ? enable : !this.fxActive;
    if (this.fxActive) {
      this.triggerBeatFx();
    }
    return this.fxActive;
  }

  // --- Classic DJ Performance Sampler Pads ---

  public playAirhorn() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.9, now);
    masterGain.connect(ctx.destination);

    const pulses = [
      { start: 0, duration: 0.12 },
      { start: 0.15, duration: 0.12 },
      { start: 0.3, duration: 0.14 },
      { start: 0.48, duration: 0.65 },
    ];

    pulses.forEach((pulse) => {
      const pStart = now + pulse.start;
      const pEnd = pStart + pulse.duration;
      const freqs = [466.16, 587.33, 698.46, 932.33];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(freq * 0.92, pStart);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, pStart + 0.04);
        osc.frequency.setValueAtTime(freq, pStart + 0.08);

        gain.gain.setValueAtTime(0, pStart);
        gain.gain.linearRampToValueAtTime(0.22, pStart + 0.015);
        gain.gain.setValueAtTime(0.2, pEnd - 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, pEnd);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(pStart);
        osc.stop(pEnd);
      });
    });
  }

  public play808Drop() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.7);

    gain.gain.setValueAtTime(this.volume * 1.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  public playVinylScratch() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(1400, now + 0.07);
    osc.frequency.linearRampToValueAtTime(220, now + 0.16);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.Q.value = 3.5;

    gain.gain.setValueAtTime(this.volume * 0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playScratchChirp(dir: 1 | -1 = 1, speed: number = 1.0) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const startFreq = dir > 0 ? 320 * speed : 750 * speed;
    const endFreq = dir > 0 ? 880 * speed : 220 * speed;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playLaser() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2600, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);

    gain.gain.setValueAtTime(this.volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playSnareRoll() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.7, now);
    masterGain.connect(ctx.destination);

    const hits = 8;
    for (let i = 0; i < hits; i++) {
      const hitTime = now + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200 - i * 6, hitTime);
      gain.gain.setValueAtTime(0.4, hitTime);
      gain.gain.exponentialRampToValueAtTime(0.01, hitTime + 0.05);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(hitTime);
      osc.stop(hitTime + 0.05);
    }
  }

  public playRiserSweep() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 1.2);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.7, now + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.25);
  }

  public playTapeStop() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.55);

    gain.gain.setValueAtTime(this.volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  public playApplause() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const bufLen = ctx.sampleRate * 1.4;
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.2);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.6, now);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 1.4);
  }

  public playSiren() {
    this.playLaser();
  }

  public playVinylBrake() {
    this.playTapeStop();
  }

  public playBackspin() {
    this.playVinylScratch();
  }

  public playRaveStab() {
    this.playAirhorn();
  }

  public playBeatClick(_isDownbeat: boolean = false) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(_isDownbeat ? 880 : 440, now);
    gain.gain.setValueAtTime(this.volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const audioFx = new AudioFxEngine();
