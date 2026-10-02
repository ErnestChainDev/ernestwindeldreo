import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import './DotGrid.css';

export interface DotGridProps {
  interactive?: boolean;
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;
  className?: string;
  style?: CSSProperties;
}
type Dot = { x: number; y: number; dx: number; dy: number; vx: number; vy: number };
const rgb = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));

export default function DotGrid({ interactive = true, dotSize = 2, gap = 32, baseColor = '#343436', activeColor = '#1f1c1c', proximity = 150, speedTrigger = 100, shockRadius = 250, shockStrength = 5, maxSpeed = 5000, resistance = 750, returnDuration = 1.5, className = '', style }: DotGridProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!interactive) return;
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const base = rgb(baseColor);
    const active = rgb(activeColor);
    let dots: Dot[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let pointer = { x: Infinity, y: Infinity, clientX: 0, clientY: 0, time: 0 };
    const damping = Math.max(.65, Math.min(.9, 1 - resistance / 5000));
    const spring = .04 / Math.max(.25, returnDuration);

    const draw = () => {
      frame = 0;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      let moving = false;
      for (const dot of dots) {
        if (!reducedMotion.matches) {
          dot.vx = (dot.vx - dot.dx * spring) * damping;
          dot.vy = (dot.vy - dot.dy * spring) * damping;
          dot.dx += dot.vx;
          dot.dy += dot.vy;
        }
        if (Math.abs(dot.dx) + Math.abs(dot.dy) + Math.abs(dot.vx) + Math.abs(dot.vy) > .05) moving = true;
        else { dot.dx = dot.dy = dot.vx = dot.vy = 0; }
        const distance = Math.hypot(dot.x - pointer.x, dot.y - pointer.y);
        const blend = interactive && !reducedMotion.matches && proximity > 0 ? Math.max(0, 1 - distance / proximity) : 0;
        ctx.fillStyle = blend ? `rgb(${base.map((color, index) => Math.round(color + (active[index] - color) * blend)).join(',')})` : baseColor;
        ctx.beginPath();
        ctx.arc(dot.x + dot.dx, dot.y + dot.dy, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Static grids and settled animations consume no frames while idle.
      if (moving && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(draw);
    };
    const schedule = () => { if (ctx && !frame && !document.hidden) frame = requestAnimationFrame(draw); };
    const buildGrid = () => {
      ({ width, height } = wrapper.getBoundingClientRect());
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cell = dotSize + gap;
      const columns = Math.floor((width + gap) / cell);
      const rows = Math.floor((height + gap) / cell);
      const startX = (width - (cell * columns - gap)) / 2 + dotSize / 2;
      const startY = (height - (cell * rows - gap)) / 2 + dotSize / 2;
      dots = Array.from({ length: columns * rows }, (_, index) => ({ x: startX + (index % columns) * cell, y: startY + Math.floor(index / columns) * cell, dx: 0, dy: 0, vx: 0, vy: 0 }));
      schedule();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
      if (!ctx) {
        ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.style.opacity = '1';
        wrapper.style.backgroundImage = 'none';
        buildGrid();
      }
      const bounds = canvas.getBoundingClientRect();
      const now = performance.now();
      const elapsed = pointer.time ? Math.max(now - pointer.time, 16) : 16;
      const vx = (event.clientX - pointer.clientX) / elapsed;
      const vy = (event.clientY - pointer.clientY) / elapsed;
      const speed = Math.min(Math.hypot(vx, vy) * 1000, maxSpeed);
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, clientX: event.clientX, clientY: event.clientY, time: now };
      if (speed > speedTrigger) {
        for (const dot of dots) {
          const distance = Math.hypot(dot.x - pointer.x, dot.y - pointer.y);
          if (distance >= proximity) continue;
          const force = (1 - distance / proximity) * Math.min(speed / 1000, 2);
          dot.vx += (dot.x - pointer.x + vx * 5) * force * .05;
          dot.vy += (dot.y - pointer.y + vy * 5) * force * .05;
        }
      }
      schedule();
    };
    const click = (event: MouseEvent) => {
      if (!shockStrength || reducedMotion.matches) return;
      const bounds = canvas.getBoundingClientRect();
      for (const dot of dots) {
        const dx = dot.x - (event.clientX - bounds.left);
        const dy = dot.y - (event.clientY - bounds.top);
        const force = Math.max(0, 1 - Math.hypot(dx, dy) / shockRadius) * shockStrength * .1;
        dot.vx += dx * force;
        dot.vy += dy * force;
      }
      schedule();
    };
    const reset = () => {
      pointer.x = pointer.y = Infinity;
      for (const dot of dots) dot.dx = dot.dy = dot.vx = dot.vy = 0;
      schedule();
    };
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else schedule();
    };
    const observer = new ResizeObserver(buildGrid);
    observer.observe(wrapper);
    buildGrid();
    if (interactive) {
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('click', click);
      window.addEventListener('blur', reset);
      document.documentElement.addEventListener('pointerleave', reset);
    }
    reducedMotion.addEventListener('change', reset);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('click', click);
      window.removeEventListener('blur', reset);
      document.documentElement.removeEventListener('pointerleave', reset);
      reducedMotion.removeEventListener('change', reset);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [interactive, dotSize, gap, baseColor, activeColor, proximity, speedTrigger, shockRadius, shockStrength, maxSpeed, resistance, returnDuration]);

  return <div className={`dot-grid ${className}`} style={style}><div ref={wrapperRef} className="dot-grid__wrap" style={{ backgroundImage: `radial-gradient(circle, ${baseColor} ${dotSize / 2}px, transparent ${dotSize / 2}px)`, backgroundSize: `${dotSize + gap}px ${dotSize + gap}px`, backgroundPosition: 'center' }}><canvas ref={canvasRef} className="dot-grid__canvas" style={{ opacity: 0 }} aria-hidden="true" /></div></div>;
}
