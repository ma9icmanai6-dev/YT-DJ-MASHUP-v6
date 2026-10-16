import React, { useEffect, useRef } from 'react';

export type VisualizerMode =
  | 'none'
  | 'asva-motion'
  | 'v-machine'
  | 'radial-pulse'
  | 'synthwave-3d'
  | 'kaleidoscope'
  | 'spectrum-bars'
  | 'cyber-matrix'
  | 'starfield-warp'
  | 'laser-osc'
  | 'plasma-ripple';

export type VisualizerTheme = 'cyber-dual' | 'neon-sunset' | 'matrix-green' | 'solar-gold' | 'ice-blue';

interface AwesomeAudioVisualizerProps {
  mode: VisualizerMode;
  theme?: VisualizerTheme;
  opacity?: number; // 0 to 1
  isPlayingA: boolean;
  isPlayingB: boolean;
  bpmA: number;
  bpmB: number;
  currentTimeA: number;
  currentTimeB: number;
  crossfader: number; // -1 to +1
  className?: string;
  blendMode?: 'screen' | 'overlay' | 'difference' | 'color-dodge' | 'normal';
}

interface Star {
  x: number;
  y: number;
  z: number;
  pz: number;
}

interface MatrixDrop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

interface AsvaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export const AwesomeAudioVisualizer: React.FC<AwesomeAudioVisualizerProps> = ({
  mode,
  theme = 'cyber-dual',
  opacity = 0.85,
  isPlayingA,
  isPlayingB,
  bpmA,
  bpmB,
  currentTimeA,
  currentTimeB,
  crossfader,
  className = '',
  blendMode = 'screen',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Persistent state across frames
  const starsRef = useRef<Star[]>([]);
  const matrixDropsRef = useRef<MatrixDrop[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const asvaParticlesRef = useRef<AsvaParticle[]>([]);
  const barPeaksRef = useRef<number[]>([]);
  const smoothedFftRef = useRef<number[]>(new Array(64).fill(0));
  const timeRef = useRef<number>(0);
  const lastBeatTimeRef = useRef<number>(0);

  // Color theme helper
  const getThemeColors = (themeName: VisualizerTheme, pos: number) => {
    switch (themeName) {
      case 'neon-sunset':
        return {
          primary: '#f43f5e', // rose-500
          secondary: '#ec4899', // pink-500
          accent: '#8b5cf6', // violet-500
          glow: 'rgba(244, 63, 94, 0.6)',
          bgGradient: ['#f43f5e', '#a855f7'],
        };
      case 'matrix-green':
        return {
          primary: '#10b981', // emerald-500
          secondary: '#22c55e', // green-500
          accent: '#84cc16', // lime-500
          glow: 'rgba(16, 185, 129, 0.6)',
          bgGradient: ['#10b981', '#064e3b'],
        };
      case 'solar-gold':
        return {
          primary: '#f59e0b', // amber-500
          secondary: '#f97316', // orange-500
          accent: '#eab308', // yellow-500
          glow: 'rgba(245, 158, 11, 0.6)',
          bgGradient: ['#f59e0b', '#dc2626'],
        };
      case 'ice-blue':
        return {
          primary: '#38bdf8', // light blue
          secondary: '#60a5fa', // blue
          accent: '#ffffff', // white
          glow: 'rgba(56, 189, 248, 0.6)',
          bgGradient: ['#38bdf8', '#1e40af'],
        };
      case 'cyber-dual':
      default: {
        // Blends smoothly from Cyan (Deck A, pos = 0) to Amber (Deck B, pos = 1)
        const primary = pos < 0.5 ? '#06b6d4' : '#f59e0b';
        const secondary = pos < 0.5 ? '#3b82f6' : '#d97706';
        const accent = '#d946ef'; // fuchsia blend accent
        return {
          primary,
          secondary,
          accent,
          glow: pos < 0.5 ? 'rgba(6, 182, 212, 0.6)' : 'rgba(245, 158, 11, 0.6)',
          bgGradient: ['#06b6d4', '#f59e0b'],
        };
      }
    }
  };

  useEffect(() => {
    if (mode === 'none') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize Starfield stars if not already done
    if (starsRef.current.length === 0) {
      const stars: Star[] = [];
      for (let i = 0; i < 450; i++) {
        stars.push({
          x: (Math.random() - 0.5) * 3000,
          y: (Math.random() - 0.5) * 2000,
          z: Math.random() * 1000 + 1,
          pz: 1000,
        });
      }
      starsRef.current = stars;
    }

    // Initialize ASVA streamline particles if not already done
    if (asvaParticlesRef.current.length === 0) {
      const particles: AsvaParticle[] = [];
      for (let i = 0; i < 110; i++) {
        particles.push({
          x: Math.random() * 2400,
          y: Math.random() * 900,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          size: 2 + Math.random() * 3.5,
          alpha: 0.35 + Math.random() * 0.65,
          color: i % 2 === 0 ? '#06b6d4' : '#f59e0b',
        });
      }
      asvaParticlesRef.current = particles;
    }

    let isRunning = true;

    // Accurate resize function that syncs physical buffer pixels to true element bounding box
    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const parent = canvas.parentElement;
      const parentRect = parent ? parent.getBoundingClientRect() : null;

      const cssW = Math.round(
        rect.width > 0
          ? rect.width
          : parentRect && parentRect.width > 0
          ? parentRect.width
          : canvas.clientWidth || parent?.clientWidth || window.innerWidth
      );
      const cssH = Math.round(
        rect.height > 0
          ? rect.height
          : parentRect && parentRect.height > 0
          ? parentRect.height
          : canvas.clientHeight || parent?.clientHeight || 300
      );

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.max(1, Math.floor(cssW * dpr));
      const targetH = Math.max(1, Math.floor(cssH * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(canvas);
    if (canvas.parentElement) {
      ro.observe(canvas.parentElement);
    }
    window.addEventListener('resize', resizeCanvas);

    const glyphs = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';

    const render = () => {
      if (!isRunning || !canvasRef.current) return;
      const c = canvasRef.current;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      // Logical CSS coordinates: strictly (0 to w, 0 to h) matching the element's full bounds
      const w = c.width / dpr;
      const h = c.height / dpr;

      if (w <= 0 || h <= 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Reset the transform matrix to DPR scaling every frame to eliminate drift or multiplier bugs
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      timeRef.current += 0.016;
      const t = timeRef.current;

      // Effective BPM and audio energy
      const isAnyPlaying = isPlayingA || isPlayingB;
      const activeBpm = isPlayingB ? (bpmB || 128) : isPlayingA ? (bpmA || 128) : 124;
      const beatPeriod = 60 / Math.max(60, activeBpm);

      // Crossfader position (-1 to +1 -> 0 to 1)
      const pos = (crossfader + 1) / 2;
      const colors = getThemeColors(theme, pos);

      // Beat pulse (0 to 1 transient spike)
      const songTime = isPlayingB ? currentTimeB : currentTimeA;
      const beatPhase = (songTime % beatPeriod) / beatPeriod;
      const beatPulse = isAnyPlaying ? Math.pow(Math.max(0, 1 - beatPhase * 2.2), 3) : 0.15;

      // Downbeat ripple creation
      if (isAnyPlaying && beatPhase < 0.08 && t - lastBeatTimeRef.current > beatPeriod * 0.7) {
        lastBeatTimeRef.current = t;
        ripplesRef.current.push({
          x: w / 2,
          y: h / 2,
          radius: 10,
          maxRadius: Math.hypot(w, h) * 0.75,
          opacity: 0.9,
          color: colors.primary,
        });
      }

      // Update synthetic audio frequency spectrum (64 bins)
      const numBins = 64;
      const fft = smoothedFftRef.current;
      const peaks = barPeaksRef.current;
      if (peaks.length !== numBins) {
        barPeaksRef.current = new Array(numBins).fill(0);
      }

      for (let i = 0; i < numBins; i++) {
        const freqRatio = i / numBins;
        let target = 0;
        if (isAnyPlaying) {
          const bassBoost = (1 - freqRatio) * beatPulse * 0.95;
          const harmonic = Math.sin(t * 8 + i * 0.3) * 0.25 + 0.35;
          const noise = (Math.random() - 0.5) * 0.12;
          target = Math.max(0.05, Math.min(1, bassBoost + harmonic * (1 - freqRatio * 0.45) + noise));
        } else {
          target = 0.08 + Math.sin(t * 2 + i * 0.2) * 0.05;
        }

        if (target > fft[i]) {
          fft[i] = fft[i] * 0.4 + target * 0.6;
        } else {
          fft[i] = fft[i] * 0.88 + target * 0.12;
        }

        if (fft[i] > barPeaksRef.current[i]) {
          barPeaksRef.current[i] = fft[i];
        } else {
          barPeaksRef.current[i] = Math.max(0, barPeaksRef.current[i] - 0.012);
        }
      }

      // Clear the logical canvas area
      ctx.clearRect(0, 0, w, h);

      // ==========================================
      // 0. ASVA MOTION (Audio-Synchronized Visual Animation - ECCV 2024 lzhangbj/ASVA)
      // ==========================================
      if (mode === 'asva-motion') {
        ctx.save();

        // 1. AVSync15 Audio-Conditioned Dynamic Deformation Grid (Spanning 100% full width and height)
        const cols = 16;
        const rows = 8;
        const cellW = w / cols;
        const cellH = h / rows;

        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 14;

        // Draw horizontal deformed audio flow streamlines across 100% width
        for (let r = 0; r <= rows; r++) {
          const baseY = r * cellH;
          const bin = Math.floor((r / rows) * numBins);
          const strokeCol = r % 2 === 0 ? colors.primary : colors.secondary;

          ctx.strokeStyle = strokeCol;
          ctx.shadowColor = strokeCol;
          ctx.globalAlpha = 0.45 + beatPulse * 0.45;

          ctx.beginPath();
          for (let x = 0; x <= w; x += 15) {
            const xRatio = x / w;
            const xFreq = fft[Math.floor(xRatio * numBins)] || 0.1;
            // Wave displacement temporal dynamics
            const yOffset =
              Math.sin(x * 0.015 + t * 4 + r) * (14 + xFreq * 36 * (1 + beatPulse * 0.8)) +
              Math.cos(t * 3 + x * 0.02) * (beatPulse * 15);

            if (x === 0) ctx.moveTo(0, baseY + yOffset);
            else ctx.lineTo(x, baseY + yOffset);
          }
          ctx.stroke();
        }

        // Draw vertical optical flow displacement lines across 100% height
        for (let c = 0; c <= cols; c++) {
          const baseX = c * cellW;
          const bin = Math.floor((c / cols) * numBins);
          const freqVal = fft[bin] || 0.1;
          const strokeCol = c < cols / 2 ? colors.primary : colors.secondary;

          ctx.strokeStyle = strokeCol;
          ctx.shadowColor = strokeCol;
          ctx.globalAlpha = 0.35 + beatPulse * 0.35;

          ctx.beginPath();
          for (let y = 0; y <= h; y += 15) {
            const xOffset =
              Math.sin(y * 0.02 + t * 3.5 + c) * (10 + freqVal * 25 * (1 + beatPulse * 0.6));
            if (y === 0) ctx.moveTo(baseX + xOffset, 0);
            else ctx.lineTo(baseX + xOffset, y);
          }
          ctx.stroke();
        }

        // 2. Optical Flow Motion Vectors (Directional arrows showing audio motion dynamics)
        const vectorCols = 8;
        const vectorRows = 4;
        const vStepX = w / (vectorCols + 1);
        const vStepY = h / (vectorRows + 1);

        for (let vr = 1; vr <= vectorRows; vr++) {
          for (let vc = 1; vc <= vectorCols; vc++) {
            const vxBase = vc * vStepX;
            const vyBase = vr * vStepY;
            const binIdx = (vc * 7 + vr * 11) % numBins;
            const energy = fft[binIdx] || 0.1;

            // Optical flow angle conditioned on audio phase and beatPulse
            const angle = t * 2.5 + (vc / vectorCols) * Math.PI + (vr / vectorRows) * Math.PI * 0.5 + energy * Math.PI;
            const arrowLen = 12 + energy * 30 + beatPulse * 16;
            const ax = vxBase + Math.cos(angle) * arrowLen;
            const ay = vyBase + Math.sin(angle) * arrowLen;

            const vecColor = vc <= vectorCols / 2 ? colors.primary : colors.secondary;
            ctx.strokeStyle = vecColor;
            ctx.fillStyle = vecColor;
            ctx.shadowColor = vecColor;
            ctx.shadowBlur = 8;
            ctx.lineWidth = 1.8;
            ctx.globalAlpha = 0.75 + beatPulse * 0.25;

            // Vector arrow line
            ctx.beginPath();
            ctx.moveTo(vxBase, vyBase);
            ctx.lineTo(ax, ay);
            ctx.stroke();

            // Arrowhead
            const headAngle = Math.PI / 6;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - 6 * Math.cos(angle - headAngle), ay - 6 * Math.sin(angle - headAngle));
            ctx.lineTo(ax - 6 * Math.cos(angle + headAngle), ay - 6 * Math.sin(angle + headAngle));
            ctx.closePath();
            ctx.fill();

            // Keyframe node center dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(vxBase, vyBase, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 3. Audio-Conditioned Streamline Kinetic Particles (100% full area coverage)
        asvaParticlesRef.current.forEach((p, idx) => {
          const bin = idx % numBins;
          const energy = fft[bin] || 0.1;
          const speedFactor = (1 + energy * 2.5) * (1 + beatPulse * 1.5);

          p.x += p.vx * speedFactor;
          p.y += p.vy * speedFactor;

          // Wrap around canvas full dimensions
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;

          ctx.fillStyle = idx % 2 === 0 ? colors.primary : colors.secondary;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.globalAlpha = p.alpha * (0.6 + beatPulse * 0.4);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + energy * 0.8), 0, Math.PI * 2);
          ctx.fill();

          // Particle trailing velocity streak
          ctx.strokeStyle = idx % 2 === 0 ? colors.primary : colors.secondary;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4);
          ctx.stroke();
        });

        // 4. AVSync Temporal Beat Shockwave Rings across screen center
        if (beatPulse > 0.4) {
          const shockRadius = (1 - (beatPhase || 0.1)) * Math.max(w, h) * 0.6;
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 2.5 * beatPulse;
          ctx.shadowColor = colors.accent;
          ctx.shadowBlur = 20;
          ctx.globalAlpha = beatPulse * 0.7;

          ctx.beginPath();
          ctx.arc(w / 2, h / 2, shockRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 5. ASVA Corner HUD Watermark
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.shadowBlur = 6;
        ctx.shadowColor = colors.primary;
        ctx.globalAlpha = 0.85;
        ctx.fillText('ASVA [ECCV 2024] · AUDIO-SYNCHRONIZED VISUAL ANIMATION', 16, 20);
        ctx.font = '9px monospace';
        ctx.fillStyle = colors.primary;
        ctx.fillText(`AVSYNC DYNAMICS: ${(0.82 + beatPulse * 0.17).toFixed(3)} | OPTICAL FLOW VELOCITY: ${(activeBpm * (1 + beatPulse)).toFixed(1)} px/s`, 16, 34);

        ctx.restore();
      }

      // ==========================================
      // V-MACHINE (Visual Loop Machine - MTD Multi-Temporal Dimension)
      // Based on goolygu/v_machine
      // ==========================================
      else if (mode === 'v-machine') {
        ctx.save();
        const cx = w / 2;
        const cy = h / 2;
        const rings = 16;
        const audioDrive = (1 + beatPulse * 2.5);

        ctx.lineWidth = 2.2;
        ctx.shadowBlur = 18;

        for (let i = 0; i < rings; i++) {
          const progress = ((t * 0.8 * audioDrive + i / rings) % 1.0 + 1.0) % 1.0;
          const radius = Math.pow(progress, 2.2) * Math.hypot(w, h) * 0.62;
          const alpha = Math.min(1, progress * 1.6);

          const col = i % 2 === 0 ? colors.primary : colors.secondary;
          ctx.strokeStyle = col;
          ctx.shadowColor = col;
          ctx.globalAlpha = alpha * (0.65 + beatPulse * 0.35);

          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(2, radius), 0, Math.PI * 2);
          ctx.stroke();

          // Multi-Temporal Dimension Spoke Rays
          const spokes = 8;
          for (let s = 0; s < spokes; s++) {
            const ang = (s / spokes) * Math.PI * 2 + t * 0.4;
            const innerR = radius * 0.8;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR);
            ctx.lineTo(cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius);
            ctx.stroke();
          }
        }

        // Full-width audio waveform conduits
        ctx.strokeStyle = colors.accent;
        ctx.shadowColor = colors.accent;
        ctx.lineWidth = 1.5 + beatPulse * 2;
        ctx.globalAlpha = 0.6 + beatPulse * 0.4;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
          const bin = Math.floor((x / w) * numBins);
          const yWarp = h * 0.85 + (fft[bin] || 0.1) * 30 * Math.sin(x * 0.02 + t * 4);
          if (x === 0) ctx.moveTo(0, yWarp);
          else ctx.lineTo(x, yWarp);
        }
        ctx.stroke();

        // V-Machine HUD Telemetry
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.shadowBlur = 6;
        ctx.shadowColor = colors.primary;
        ctx.globalAlpha = 0.85;
        ctx.fillText('V-MACHINE [MTD] · MULTI-TEMPORAL DIMENSION VISUAL LOOP', 16, 20);
        ctx.font = '9px monospace';
        ctx.fillStyle = colors.primary;
        ctx.fillText(`MTD TEMPORAL VELOCITY: ${(activeBpm * audioDrive).toFixed(1)} FPS | REVERSE SYNC: ACTIVE`, 16, 34);

        ctx.restore();
      }

      // ==========================================
      // 1. RADIAL PULSE (Circular Audio Spectrum - Widescreen Full-Area Constellation)
      // ==========================================
      else if (mode === 'radial-pulse') {
        const cx = w / 2;
        const cy = h / 2;
        const baseRadius = Math.min(w * 0.28, h * 0.24) + beatPulse * 16;
        const maxBarLen = Math.min(w * 0.48, h * 0.44) - baseRadius;
        const barCount = 64;

        // Massive ambient luminous background glow filling full screen
        const glowGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.2, cx, cy, Math.max(w, h) * 0.75);
        glowGrad.addColorStop(0, colors.glow);
        glowGrad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(w, h) * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // 1A. Full-Width Edge-to-Edge Audio Frequency Waveforms at Top and Bottom
        ctx.save();
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;

        // Top edge frequency wave (from x = 0 to x = w)
        ctx.strokeStyle = colors.primary;
        ctx.shadowColor = colors.primary;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 10) {
          const bin = Math.floor((x / w) * numBins);
          const yWave = 22 + (fft[bin] || 0.1) * 35 * Math.sin(x * 0.02 + t * 4);
          if (x === 0) ctx.moveTo(0, yWave);
          else ctx.lineTo(x, yWave);
        }
        ctx.stroke();

        // Bottom edge frequency wave (from x = 0 to x = w)
        ctx.strokeStyle = colors.secondary;
        ctx.shadowColor = colors.secondary;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 10) {
          const bin = Math.floor((1 - x / w) * numBins);
          const yWave = h - 22 - (fft[bin] || 0.1) * 35 * Math.sin(x * 0.02 - t * 4);
          if (x === 0) ctx.moveTo(0, yWave);
          else ctx.lineTo(x, yWave);
        }
        ctx.stroke();

        // Center connecting laser conduit across full screen
        ctx.strokeStyle = colors.accent;
        ctx.shadowColor = colors.accent;
        ctx.lineWidth = 1 + beatPulse * 2;
        ctx.globalAlpha = 0.5 + beatPulse * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(cx - baseRadius * 1.2, cy);
        ctx.moveTo(cx + baseRadius * 1.2, cy);
        ctx.lineTo(w, cy);
        ctx.stroke();
        ctx.restore();

        // 1B. Left (Deck A) and Right (Deck B) Satellite Spectrum Rings for Widescreen Balance
        const satRadius = baseRadius * 0.45;
        const satOffset = Math.min(w * 0.32, Math.max(120, w * 0.30));

        // Deck A Satellite (Left)
        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = colors.primary;
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - satOffset, cy, satRadius, 0, Math.PI * 2);
        ctx.stroke();
        for (let s = 0; s < 24; s++) {
          const ang = (s / 24) * Math.PI * 2 - t * 0.5;
          const sVal = fft[s % numBins] || 0.1;
          const sLen = sVal * (satRadius * 0.6);
          ctx.beginPath();
          ctx.moveTo(cx - satOffset + Math.cos(ang) * satRadius, cy + Math.sin(ang) * satRadius);
          ctx.lineTo(cx - satOffset + Math.cos(ang) * (satRadius + sLen), cy + Math.sin(ang) * (satRadius + sLen));
          ctx.stroke();
        }

        // Deck B Satellite (Right)
        ctx.shadowColor = colors.secondary;
        ctx.strokeStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(cx + satOffset, cy, satRadius, 0, Math.PI * 2);
        ctx.stroke();
        for (let s = 0; s < 24; s++) {
          const ang = (s / 24) * Math.PI * 2 + t * 0.5;
          const sVal = fft[(s + 16) % numBins] || 0.1;
          const sLen = sVal * (satRadius * 0.6);
          ctx.beginPath();
          ctx.moveTo(cx + satOffset + Math.cos(ang) * satRadius, cy + Math.sin(ang) * satRadius);
          ctx.lineTo(cx + satOffset + Math.cos(ang) * (satRadius + sLen), cy + Math.sin(ang) * (satRadius + sLen));
          ctx.stroke();
        }
        ctx.restore();

        // 1C. Inner glowing core ring
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = colors.primary;
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 1D. Radial Spectrum Bars
        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2 + t * 0.2;
          const binIndex = i < barCount / 2 ? i : barCount - i;
          const val = fft[binIndex % numBins] || 0.1;
          const barLen = val * Math.max(20, maxBarLen);

          const x1 = cx + Math.cos(angle) * baseRadius;
          const y1 = cy + Math.sin(angle) * baseRadius;
          const x2 = cx + Math.cos(angle) * (baseRadius + barLen);
          const y2 = cy + Math.sin(angle) * (baseRadius + barLen);

          const isDeckA = i < barCount / 2;
          const barColor = isDeckA ? colors.primary : colors.secondary;

          ctx.save();
          ctx.strokeStyle = barColor;
          ctx.lineWidth = Math.max(2, (Math.PI * 2 * baseRadius) / barCount * 0.65);
          ctx.lineCap = 'round';
          ctx.shadowBlur = 12;
          ctx.shadowColor = barColor;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          const peakVal = barPeaksRef.current[binIndex % numBins] || 0.1;
          const px = cx + Math.cos(angle) * (baseRadius + peakVal * maxBarLen + 6);
          const py = cy + Math.sin(angle) * (baseRadius + peakVal * maxBarLen + 6);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // ==========================================
      // 2. SYNTHWAVE 3D HORIZON (Retro Tron Grid & Sun)
      // ==========================================
      else if (mode === 'synthwave-3d') {
        const horizonY = h * 0.5;

        // Retro Neon Sun on the Horizon
        const sunRadius = Math.min(w, h) * 0.22;
        const sunX = w / 2;
        const sunY = horizonY - sunRadius * 0.25;

        ctx.save();
        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#fde047');
        sunGrad.addColorStop(0.5, '#f43f5e');
        sunGrad.addColorStop(1, '#a855f7');
        ctx.fillStyle = sunGrad;
        ctx.shadowBlur = 35;
        ctx.shadowColor = '#f43f5e';

        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        // Horizontal laser blinds through sun
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 7; i++) {
          const stripeY = sunY + (i / 7) * sunRadius;
          const stripeH = 2 + i * 2;
          ctx.fillRect(sunX - sunRadius, stripeY, sunRadius * 2, stripeH);
        }
        ctx.restore();

        // Horizon Neon Laser Mountain Silhouettes (spanning 100% full width from 0 to w)
        ctx.save();
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = colors.secondary;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= w; x += 30) {
          const mIdx = Math.floor((x / w) * numBins);
          const mHeight = (fft[mIdx] || 0.1) * (h * 0.18);
          ctx.lineTo(x, horizonY - mHeight);
        }
        ctx.lineTo(w, horizonY);
        ctx.stroke();
        ctx.restore();

        // Wireframe Perspective 3D Grid (stretching 100% full width from 0 to w)
        const gridSpeed = (activeBpm / 120) * 85;
        const gridOffset = (t * gridSpeed) % 40;

        ctx.save();
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors.primary;

        // Horizontal perspective lines spanning 100% width from 0 to w
        for (let y = horizonY; y < h; y += 1) {
          const depth = (y - horizonY) / (h - horizonY);
          const expDepth = Math.pow(depth, 2.5);
          const lineY = horizonY + expDepth * (h - horizonY);

          if (Math.floor(lineY + gridOffset) % 24 < 2) {
            ctx.beginPath();
            ctx.moveTo(0, lineY);
            ctx.lineTo(w, lineY);
            ctx.stroke();
          }
        }

        // Vanishing Perspective Lines from Horizon Center to outer widescreen bounds
        const numVLines = 32;
        for (let i = 0; i <= numVLines; i++) {
          const bottomX = (i / numVLines) * w * 2.0 - w * 0.5;
          ctx.beginPath();
          ctx.moveTo(w / 2, horizonY);
          ctx.lineTo(bottomX, h);
          ctx.stroke();
        }

        // Horizon Laser Line
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 3 + beatPulse * 3;
        ctx.shadowBlur = 25;
        ctx.shadowColor = colors.secondary;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(w, horizonY);
        ctx.stroke();
        ctx.restore();
      }

      // ==========================================
      // 3. KALEIDOSCOPE (Symmetric VJ Mandala)
      // ==========================================
      else if (mode === 'kaleidoscope') {
        const cx = w / 2;
        const cy = h / 2;
        const segments = 12;
        const angleStep = (Math.PI * 2) / segments;
        const maxRadius = Math.hypot(w, h) * 0.55;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.15);

        for (let s = 0; s < segments; s++) {
          ctx.save();
          ctx.rotate(s * angleStep);
          if (s % 2 === 1) ctx.scale(1, -1);

          ctx.shadowBlur = 16;
          ctx.shadowColor = s % 2 === 0 ? colors.primary : colors.secondary;
          ctx.strokeStyle = s % 2 === 0 ? colors.primary : colors.secondary;
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(0, 0);

          for (let p = 0; p < 10; p++) {
            const r = (p + 1) * (maxRadius / 10) + (fft[p * 4] || 0.1) * 75;
            const a = p * 0.35 + Math.sin(t * 2 + p) * 0.2;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.restore();
        }

        ctx.fillStyle = colors.accent;
        ctx.shadowBlur = 30;
        ctx.shadowColor = colors.accent;
        ctx.beginPath();
        ctx.arc(0, 0, 16 + beatPulse * 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // ==========================================
      // 4. SPECTRUM BARS (Dual Deck Mirrored Equalizer - 100% Full Width Stretch)
      // ==========================================
      else if (mode === 'spectrum-bars') {
        const barCount = 64;
        const step = w / barCount;
        const barWidth = step * 0.82;
        const gap = step * 0.18;
        const maxH = h * 0.78;
        const groundY = h * 0.88;

        for (let i = 0; i < barCount; i++) {
          const x = i * step + gap / 2;
          const val = fft[Math.floor((i / barCount) * numBins)] || 0.1;
          const barHeight = val * maxH;
          const peakHeight = (barPeaksRef.current[Math.floor((i / barCount) * numBins)] || 0.1) * maxH;

          // Gradient color: Cyan on left (Deck A) to Amber on right (Deck B)
          const grad = ctx.createLinearGradient(x, groundY, x, groundY - barHeight);
          const ratio = i / barCount;
          if (ratio < 0.45) {
            grad.addColorStop(0, '#06b6d4');
            grad.addColorStop(1, '#3b82f6');
          } else if (ratio > 0.55) {
            grad.addColorStop(0, '#f59e0b');
            grad.addColorStop(1, '#ef4444');
          } else {
            grad.addColorStop(0, '#a855f7');
            grad.addColorStop(1, '#ec4899');
          }

          ctx.save();
          ctx.fillStyle = grad;
          ctx.shadowBlur = 12;
          ctx.shadowColor = ratio < 0.5 ? colors.primary : colors.secondary;

          // Main vertical bar
          ctx.beginPath();
          ctx.roundRect(x, groundY - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          // Mirrored Reflection with transparency
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          ctx.roundRect(x, groundY + 2, barWidth, barHeight * 0.4, [0, 0, 4, 4]);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Peak cap line
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
          ctx.fillRect(x, groundY - peakHeight - 3, barWidth, 3);
          ctx.restore();
        }
      }

      // ==========================================
      // 5. CYBER MATRIX (Digital Code Rain - 100% Full Width Stretch)
      // ==========================================
      else if (mode === 'cyber-matrix') {
        const glyphsList = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓ';
        ctx.font = '14px monospace';

        // Dynamically maintain columns so rain covers the 100% full width of the screen
        const colStep = 20;
        const neededCols = Math.ceil(w / colStep) + 2;
        while (matrixDropsRef.current.length < neededCols) {
          const idx = matrixDropsRef.current.length;
          const chars: string[] = [];
          for (let j = 0; j < 25; j++) {
            chars.push(glyphsList[Math.floor(Math.random() * glyphsList.length)]);
          }
          matrixDropsRef.current.push({
            x: idx * colStep,
            y: Math.random() * -600,
            speed: 3 + Math.random() * 5,
            chars,
          });
        }

        matrixDropsRef.current.forEach((drop, idx) => {
          drop.x = idx * colStep; // strictly align across width
          const effectiveSpeed = drop.speed * (1 + beatPulse * 1.8);
          drop.y += effectiveSpeed;
          if (drop.y > h + 300) {
            drop.y = -200;
          }

          drop.chars.forEach((char, cIdx) => {
            const charY = drop.y + cIdx * 18;
            if (charY < -20 || charY > h + 20) return;

            if (Math.random() < 0.05) {
              drop.chars[cIdx] = glyphsList[Math.floor(Math.random() * glyphsList.length)];
            }

            ctx.save();
            if (cIdx === drop.chars.length - 1) {
              ctx.fillStyle = '#ffffff';
              ctx.shadowBlur = 15;
              ctx.shadowColor = colors.primary;
            } else {
              const alpha = Math.max(0.1, 1 - (drop.chars.length - cIdx) / drop.chars.length);
              ctx.fillStyle = colors.primary;
              ctx.globalAlpha = alpha;
            }

            ctx.fillText(char, drop.x, charY);
            ctx.restore();
          });
        });

        // Transient Glitch Horizontal Slice on Beat Drop
        if (beatPulse > 0.6) {
          ctx.save();
          const sliceY = (Math.random() * h * 0.8) | 0;
          const sliceH = 15 + Math.random() * 30;
          ctx.fillStyle = colors.accent;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(0, sliceY, w, sliceH);
          ctx.restore();
        }
      }

      // ==========================================
      // 6. STARFIELD WARP (3D Velocity Tunnel - 100% Full Viewport)
      // ==========================================
      else if (mode === 'starfield-warp') {
        const cx = w / 2;
        const cy = h / 2;
        const warpSpeed = (activeBpm / 120) * 12 + beatPulse * 40;

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors.primary;

        starsRef.current.forEach((star) => {
          star.pz = star.z;
          star.z -= warpSpeed;

          if (star.z <= 0) {
            star.z = 1000;
            star.pz = 1000;
            star.x = (Math.random() - 0.5) * (w * 2.2);
            star.y = (Math.random() - 0.5) * (h * 2.2);
          }

          const k = 400 / star.z;
          const px = star.x * k + cx;
          const py = star.y * k + cy;

          const pk = 400 / star.pz;
          const prevX = star.x * pk + cx;
          const prevY = star.y * pk + cy;

          if (px >= 0 && px <= w && py >= 0 && py <= h) {
            const size = Math.max(1, (1 - star.z / 1000) * 4.5);
            const alpha = Math.min(1, (1 - star.z / 1000) * 1.5);

            ctx.strokeStyle = star.x > 0 ? colors.secondary : colors.primary;
            ctx.lineWidth = size;
            ctx.globalAlpha = alpha;

            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // ==========================================
      // 7. LASER OSCILLOSCOPE (Lissajous Harmonics - Full Viewport)
      // ==========================================
      else if (mode === 'laser-osc') {
        const cx = w / 2;
        const cy = h / 2;
        const radiusX = w * 0.44;
        const radiusY = h * 0.42;

        const freqRatioA = 3;
        const freqRatioB = 2;
        const delta = t * 1.8;
        const points = 500;

        ctx.save();
        ctx.shadowBlur = 24;
        ctx.shadowColor = colors.primary;
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2.5 + beatPulse * 3;

        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const theta = (i / points) * Math.PI * 2;
          const waveWiggle = (fft[i % numBins] || 0) * 35;
          const x = cx + Math.sin(theta * freqRatioA + delta) * (radiusX + waveWiggle);
          const y = cy + Math.cos(theta * freqRatioB) * (radiusY + waveWiggle);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = colors.secondary;
        ctx.shadowColor = colors.secondary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const theta = (i / points) * Math.PI * 2;
          const waveWiggle = (fft[(i + 16) % numBins] || 0) * 20;
          const x = cx + Math.sin(theta * 5 - delta * 0.8) * (radiusX * 0.65 + waveWiggle);
          const y = cy + Math.cos(theta * 4 + delta) * (radiusY * 0.65 + waveWiggle);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // ==========================================
      // 8. PLASMA RIPPLE (Concentric Liquid Waves - Full Screen)
      // ==========================================
      else if (mode === 'plasma-ripple') {
        ctx.save();
        ripplesRef.current = ripplesRef.current.filter((r) => r.opacity > 0.02);

        ripplesRef.current.forEach((r) => {
          r.radius += (activeBpm / 120) * 6.5;
          r.opacity *= 0.96;

          ctx.strokeStyle = r.color;
          ctx.lineWidth = 4 * r.opacity;
          ctx.shadowBlur = 20;
          ctx.shadowColor = r.color;
          ctx.globalAlpha = r.opacity;

          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Ambient fluid interference waves spanning 100% full width from 0 to w
        const waveLines = 8;
        for (let j = 0; j < waveLines; j++) {
          const waveY = (h / (waveLines + 1)) * (j + 1);
          ctx.strokeStyle = j % 2 === 0 ? colors.primary : colors.secondary;
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = 10;
          ctx.shadowColor = colors.glow;
          ctx.globalAlpha = 0.5 + beatPulse * 0.3;

          ctx.beginPath();
          for (let x = 0; x <= w; x += 10) {
            const freqVal = fft[Math.floor((x / w) * numBins)] || 0.1;
            const yOffset = Math.sin(x * 0.02 + t * 4 + j) * (20 + freqVal * 40);
            if (x === 0) ctx.moveTo(x, waveY + yOffset);
            else ctx.lineTo(x, waveY + yOffset);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [mode, theme, isPlayingA, isPlayingB, bpmA, bpmB, currentTimeA, currentTimeB, crossfader]);

  if (mode === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block absolute inset-0 pointer-events-none ${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity,
        mixBlendMode: blendMode,
        willChange: 'transform',
      }}
    />
  );
};
