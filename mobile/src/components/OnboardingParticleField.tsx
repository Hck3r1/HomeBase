import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { onboardingColors } from '../lib/onboardingColors';
import { buildShapePoints, type ParticleShapeType } from '../lib/onboardingParticleShapes';

const COUNT = 56;
const CYCLE = 7000;
const FORM_START = 0.15;
const FORM_END = 0.55;
const HOLD_END = 0.78;
const DISSOLVE_END = 1.0;
const FRAME_MS = 33;
const MAX_LINES = 96;
const LINK_DIST = 64;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  r: number;
  phase: number;
  isAccent: boolean;
  drawX: number;
  drawY: number;
}

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
}

interface RenderSnapshot {
  lines: LineSegment[];
  particles: Array<Pick<Particle, 'drawX' | 'drawY' | 'r' | 'phase' | 'isAccent'>>;
  convergence: number;
}

interface Props {
  shapeType: ParticleShapeType;
  active?: boolean;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const MIN_ALPHA = 0.01;

function rgba([r, g, b]: readonly [number, number, number], alpha: number): string | null {
  const a = Math.max(0, Math.min(1, alpha));
  if (a < MIN_ALPHA) return null;
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function convergenceAt(cycleT: number): number {
  if (cycleT < FORM_START) return 0;
  if (cycleT < FORM_END) return easeInOutCubic((cycleT - FORM_START) / (FORM_END - FORM_START));
  if (cycleT < HOLD_END) return 1;
  return 1 - easeInOutCubic((cycleT - HOLD_END) / (DISSOLVE_END - HOLD_END));
}

function createParticles(w: number, h: number, shapeType: ParticleShapeType): Particle[] {
  const shapePts = buildShapePoints(shapeType, w, h, COUNT);
  const particles: Particle[] = [];

  for (let i = 0; i < COUNT; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      tx: shapePts[i]?.x ?? x,
      ty: shapePts[i]?.y ?? y,
      r: 1.2 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      isAccent: i % 11 === 0,
      drawX: x,
      drawY: y,
    });
  }

  return particles;
}

function buildLines(particles: Particle[], convergence: number): LineSegment[] {
  if (convergence < 0.05) return [];

  const lines: LineSegment[] = [];
  const maxD = convergence > 0.3 ? LINK_DIST * 1.4 : LINK_DIST;
  const candidates: LineSegment[] = [];

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.drawX - b.drawX;
      const dy = a.drawY - b.drawY;
      const d = Math.hypot(dx, dy);
      if (d < maxD) {
        candidates.push({
          x1: a.drawX,
          y1: a.drawY,
          x2: b.drawX,
          y2: b.drawY,
          opacity: (1 - d / maxD) * (0.1 + convergence * 0.22),
        });
      }
    }
  }

  candidates.sort((a, b) => b.opacity - a.opacity);
  return candidates.slice(0, MAX_LINES);
}

function buildSnapshot(
  particles: Particle[],
  convergence: number,
): RenderSnapshot {
  return {
    lines: buildLines(particles, convergence),
    particles: particles.map((p) => ({
      drawX: p.drawX,
      drawY: p.drawY,
      r: p.r,
      phase: p.phase,
      isAccent: p.isAccent,
    })),
    convergence,
  };
}

export function OnboardingParticleField({ shapeType, active = true }: Props) {
  const { width, height } = useWindowDimensions();
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef(Date.now() - Math.random() * CYCLE);
  const lastFrameRef = useRef(0);
  const shapeRef = useRef(shapeType);
  const [snapshot, setSnapshot] = useState<RenderSnapshot>({ lines: [], particles: [], convergence: 0 });

  useEffect(() => {
    if (width <= 0 || height <= 0) return;
    if (shapeRef.current === shapeType && particlesRef.current.length > 0) return;

    shapeRef.current = shapeType;
    particlesRef.current = createParticles(width, height, shapeType);
    startTimeRef.current = Date.now() - Math.random() * CYCLE;
    lastFrameRef.current = 0;
    setSnapshot(buildSnapshot(particlesRef.current, 0));
  }, [shapeType, width, height]);

  useEffect(() => {
    if (!active || width <= 0 || height <= 0) return;

    let raf = 0;

    const step = () => {
      const now = Date.now();
      if (now - lastFrameRef.current >= FRAME_MS) {
        lastFrameRef.current = now;

        const elapsed = (now - startTimeRef.current) % CYCLE;
        const cycleT = elapsed / CYCLE;
        const convergence = convergenceAt(cycleT);
        const particles = particlesRef.current;

        for (const p of particles) {
          p.x += p.vx * (1 - convergence * 0.8);
          p.y += p.vy * (1 - convergence * 0.8);
          p.phase += 0.02;

          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;

          p.drawX = p.x + (p.tx - p.x) * convergence;
          p.drawY = p.y + (p.ty - p.y) * convergence;
        }

        setSnapshot(buildSnapshot(particles, convergence));
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, width, height]);

  const sageRgb = onboardingColors.sageRgb;
  const accentRgb = onboardingColors.accentRgb;
  const { lines, particles, convergence } = snapshot;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="none">
      <Svg width={width} height={height}>
        {lines.map((line, idx) => {
          const stroke = rgba(sageRgb, line.opacity);
          if (!stroke) return null;
          return (
            <Line
              key={`l-${idx}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={stroke}
              strokeWidth={0.6}
            />
          );
        })}
        {particles.map((p, idx) => {
          const flicker = 0.7 + Math.sin(p.phase) * 0.3;
          const rgb = p.isAccent ? accentRgb : sageRgb;
          const alpha = (0.35 + convergence * 0.5) * flicker;
          const radius = p.r + convergence * 0.6;
          const fill = rgba(rgb, alpha);
          if (!fill) return null;
          return <Circle key={`p-${idx}`} cx={p.drawX} cy={p.drawY} r={radius} fill={fill} />;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: onboardingColors.bg,
  },
});
