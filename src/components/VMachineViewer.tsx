import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Sliders, Play, RotateCcw, Eye, Layers } from 'lucide-react';

export type VMachineLoopPreset =
  | 'cyber-grid'
  | 'quantum-tunnel'
  | 'neon-mandala'
  | 'acid-fractal'
  | 'matrix-flow'
  | 'rave-laser';

interface VMachineViewerProps {
  isPlayingA: boolean;
  isPlayingB: boolean;
  bpmA: number;
  bpmB: number;
  crossfader: number; // -1 to +1
  className?: string;
  defaultPreset?: VMachineLoopPreset;
}

export const VMachineViewer: React.FC<VMachineViewerProps> = ({
  isPlayingA,
  isPlayingB,
  bpmA,
  bpmB,
  crossfader,
  className = '',
  defaultPreset = 'cyber-grid',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [preset, setPreset] = useState<VMachineLoopPreset>(defaultPreset);
  const [sensitivity, setSensitivity] = useState<number>(85); // 0 to 100%
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0); // 0.5x to 4x
  const [reverseOnDrop, setReverseOnDrop] = useState<boolean>(true);
  const [blendMode, setBlendMode] = useState<'screen' | 'overlay' | 'difference' | 'normal'>('screen');
  const [opacity, setOpacity] = useState<number>(0.85);

  const temporalTimeRef = useRef<number>(0);
  const temporalDirectionRef = useRef<number>(1);
  const lastBeatRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

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
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      if (!isRunning || !canvasRef.current) return;
      const c = canvasRef.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.width / dpr;
      const h = c.height / dpr;

      if (w <= 0 || h <= 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const isAnyPlaying = isPlayingA || isPlayingB;
      const activeBpm = isPlayingB ? bpmB || 128 : isPlayingA ? bpmA || 128 : 124;
      const beatPeriod = 60 / Math.max(60, activeBpm);

      const nowSec = performance.now() / 1000;
      const beatPhase = (nowSec % beatPeriod) / beatPeriod;
      const beatPulse = isAnyPlaying ? Math.pow(Math.max(0, 1 - beatPhase * 2.2), 3) : 0.15;

      // Reverse temporal scrub on beat drop if enabled
      if (reverseOnDrop && beatPulse > 0.8 && nowSec - lastBeatRef.current > beatPeriod * 0.75) {
        lastBeatRef.current = nowSec;
        temporalDirectionRef.current *= -1;
      }

      // Multi-Temporal Dimension progression driven by audio sensitivity and speed
      const audioDrive = (sensitivity / 100) * (0.8 + beatPulse * 2.5);
      temporalTimeRef.current += 0.016 * speedMultiplier * audioDrive * temporalDirectionRef.current;
      const t = temporalTimeRef.current;

      ctx.clearRect(0, 0, w, h);

      const pos = (crossfader + 1) / 2;
      const primaryCol = pos < 0.5 ? '#06b6d4' : '#f59e0b';
      const secondaryCol = pos < 0.5 ? '#3b82f6' : '#ef4444';
      const accentCol = '#d946ef';

      // --- MTD PRESETS ---
      switch (preset) {
        case 'cyber-grid': {
          // Multi-Temporal Dimension Grid with Audio Warp
          const horizonY = h * 0.55;
          ctx.save();
          ctx.strokeStyle = primaryCol;
          ctx.lineWidth = 1.4;
          ctx.shadowBlur = 12;
          ctx.shadowColor = primaryCol;

          // Horizontal MTD depth lines
          for (let y = horizonY; y < h; y += 1) {
            const depth = (y - horizonY) / (h - horizonY);
            const expDepth = Math.pow(depth, 2.8);
            const lineY = horizonY + expDepth * (h - horizonY);
            const offset = (t * 60) % 20;

            if (Math.floor(lineY + offset) % 20 < 2) {
              ctx.beginPath();
              for (let x = 0; x <= w; x += 15) {
                const warp = Math.sin(x * 0.02 + t * 4) * (beatPulse * 16);
                if (x === 0) ctx.moveTo(x, lineY + warp);
                else ctx.lineTo(x, lineY + warp);
              }
              ctx.stroke();
            }
          }

          // Vanishing Perspective Lines
          const vLines = 28;
          for (let i = 0; i <= vLines; i++) {
            const bx = (i / vLines) * w * 2.2 - w * 0.6;
            ctx.beginPath();
            ctx.moveTo(w / 2, horizonY);
            ctx.lineTo(bx, h);
            ctx.stroke();
          }

          // Horizon Laser
          ctx.strokeStyle = secondaryCol;
          ctx.shadowColor = secondaryCol;
          ctx.lineWidth = 2.5 + beatPulse * 3;
          ctx.beginPath();
          ctx.moveTo(0, horizonY);
          ctx.lineTo(w, horizonY);
          ctx.stroke();
          ctx.restore();
          break;
        }

        case 'quantum-tunnel': {
          // Hyperspace Tunnel Scrubbing
          const cx = w / 2;
          const cy = h / 2;
          const rings = 18;
          ctx.save();
          ctx.lineWidth = 2;

          for (let i = 0; i < rings; i++) {
            const progress = ((t * 1.5 + i / rings) % 1.0 + 1.0) % 1.0;
            const radius = Math.pow(progress, 2.2) * Math.hypot(w, h) * 0.65;
            const alpha = Math.min(1, progress * 1.5);

            ctx.strokeStyle = i % 2 === 0 ? primaryCol : secondaryCol;
            ctx.shadowBlur = 14;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.globalAlpha = alpha * (0.6 + beatPulse * 0.4);

            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(2, radius), 0, Math.PI * 2);
            ctx.stroke();

            // Rotational spokes
            for (let s = 0; s < 8; s++) {
              const ang = (s / 8) * Math.PI * 2 + t * 0.5;
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(ang) * (radius * 0.8), cy + Math.sin(ang) * (radius * 0.8));
              ctx.lineTo(cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius);
              ctx.stroke();
            }
          }
          ctx.restore();
          break;
        }

        case 'neon-mandala': {
          // Audio-Reactive Geometric Kaleidoscope
          const cx = w / 2;
          const cy = h / 2;
          const segments = 12;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.4);

          for (let s = 0; s < segments; s++) {
            ctx.save();
            ctx.rotate((s / segments) * Math.PI * 2);
            if (s % 2 === 1) ctx.scale(1, -1);

            ctx.strokeStyle = s % 2 === 0 ? primaryCol : secondaryCol;
            ctx.shadowBlur = 16;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.lineWidth = 1.8;
            ctx.globalAlpha = 0.7 + beatPulse * 0.3;

            const r1 = 30 + beatPulse * 40;
            const r2 = 120 + Math.sin(t * 3) * 30;

            ctx.beginPath();
            ctx.moveTo(r1, 0);
            ctx.bezierCurveTo(r1 + 40, 50, r2 - 40, -50, r2, 0);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(r2, 0, 10 + beatPulse * 12, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
          }
          ctx.restore();
          break;
        }

        case 'acid-fractal': {
          // Fluid Fractal Ripples
          const cx = w / 2;
          const cy = h / 2;
          ctx.save();
          ctx.lineWidth = 2.2;
          ctx.shadowBlur = 18;
          ctx.shadowColor = accentCol;

          for (let r = 0; r < 12; r++) {
            const baseRad = (r + 1) * 32 + (t * 40) % 32;
            ctx.strokeStyle = r % 2 === 0 ? primaryCol : secondaryCol;
            ctx.globalAlpha = 0.5 + beatPulse * 0.4;

            ctx.beginPath();
            for (let a = 0; a <= Math.PI * 2; a += 0.1) {
              const distortion = Math.sin(a * 6 + t * 3 + r) * (15 + beatPulse * 25);
              const rad = baseRad + distortion;
              const x = cx + Math.cos(a) * rad;
              const y = cy + Math.sin(a) * rad;
              if (a === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
          }
          ctx.restore();
          break;
        }

        case 'matrix-flow': {
          // Digital Matrix Code
          ctx.save();
          ctx.font = '13px monospace';
          const cols = Math.floor(w / 22);
          for (let c = 0; c < cols; c++) {
            const x = c * 22;
            const y = ((t * 80 + c * 35) % (h + 100)) - 50;
            ctx.fillStyle = c % 2 === 0 ? primaryCol : secondaryCol;
            ctx.shadowBlur = 8;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fillText(String.fromCharCode(65 + (Math.abs(c * 7 + Math.floor(t * 10)) % 26)), x, y);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(String.fromCharCode(48 + (Math.abs(c * 3) % 10)), x, y + 16);
          }
          ctx.restore();
          break;
        }

        case 'rave-laser': {
          // 360-Degree Laser Fan
          const cx = w / 2;
          const cy = h * 0.9;
          const laserCount = 20;
          ctx.save();
          ctx.lineWidth = 2.5 + beatPulse * 3;

          for (let i = 0; i < laserCount; i++) {
            const ang = -Math.PI + (i / (laserCount - 1)) * Math.PI + Math.sin(t * 4 + i * 0.3) * 0.15;
            const len = Math.hypot(w, h);
            ctx.strokeStyle = i % 2 === 0 ? primaryCol : secondaryCol;
            ctx.shadowBlur = 20;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.globalAlpha = 0.65 + beatPulse * 0.35;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }
      }

      // V-Machine HUD Telemetry Overlay
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.globalAlpha = 0.8;
      ctx.fillText(`V-MACHINE [MTD] · ${preset.toUpperCase()} · ${(speedMultiplier).toFixed(1)}X`, 14, 18);
      ctx.fillStyle = primaryCol;
      ctx.fillText(`AUDIO DRIVE: ${audioDrive.toFixed(2)} | DIR: ${temporalDirectionRef.current > 0 ? 'FWD' : 'REV'}`, 14, 30);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [preset, sensitivity, speedMultiplier, reverseOnDrop, isPlayingA, isPlayingB, bpmA, bpmB, crossfader]);

  return (
    <div className={`relative w-full h-full min-w-full overflow-hidden ${className}`}>
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block absolute inset-0 pointer-events-none"
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
        }}
      />

      {/* Floating Control Mini-Dock (Bottom-Right) */}
      <div className="absolute bottom-2 right-2 z-30 flex items-center gap-1.5 bg-black/85 p-1 rounded-lg border border-neutral-800 text-[10px] font-mono select-none">
        <Sparkles className="w-3 h-3 text-cyan-400" />
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as VMachineLoopPreset)}
          className="bg-transparent text-white font-bold text-[10px] focus:outline-none cursor-pointer"
        >
          <option value="cyber-grid" className="bg-neutral-900">Cyber Grid</option>
          <option value="quantum-tunnel" className="bg-neutral-900">Quantum Tunnel</option>
          <option value="neon-mandala" className="bg-neutral-900">Neon Mandala</option>
          <option value="acid-fractal" className="bg-neutral-900">Acid Fractal</option>
          <option value="matrix-flow" className="bg-neutral-900">Matrix Flow</option>
          <option value="rave-laser" className="bg-neutral-900">Rave Laser</option>
        </select>

        <button
          onClick={() => setSpeedMultiplier((s) => (s >= 4.0 ? 0.5 : s * 2))}
          className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-cyan-300 font-bold border border-neutral-700"
          title="Cycle MTD Speed Multiplier"
        >
          {speedMultiplier}x
        </button>

        <button
          onClick={() => setReverseOnDrop((r) => !r)}
          className={`px-1.5 py-0.5 rounded font-bold border ${
            reverseOnDrop
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-neutral-900 text-neutral-500 border-neutral-800'
          }`}
          title="Toggle Reverse Temporal Scrubbing on Beat Drop"
        >
          REV DROP
        </button>
      </div>
    </div>
  );
};
