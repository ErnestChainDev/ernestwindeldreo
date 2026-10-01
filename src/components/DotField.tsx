import { memo, useEffect, useId, useRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

import "./DotField.css";

const TWO_PI = Math.PI * 2;

export interface DotFieldProps extends ComponentPropsWithoutRef<"div"> {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
  gradientFrom?: string;
  gradientTo?: string;
  glowColor?: string;
}

interface Dot {
  ax: number;
  ay: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

interface MouseState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  speed: number;
}

interface FieldSize {
  w: number;
  h: number;
  offsetX: number;
  offsetY: number;
}

interface AnimationSettings {
  dotRadius: number;
  dotSpacing: number;
  cursorRadius: number;
  cursorForce: number;
  bulgeOnly: boolean;
  bulgeStrength: number;
  sparkle: boolean;
  waveAmplitude: number;
  gradientFrom: string;
  gradientTo: string;
}

const DotField = memo(function DotField({
  dotRadius = 1.5,
  dotSpacing = 14,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
  gradientFrom = "rgba(168, 85, 247, 0.35)",
  gradientTo = "rgba(180, 151, 207, 0.25)",
  glowColor = "#120F17",
  className,
  ...rest
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<SVGCircleElement | null>(null);

  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number | null>(null);
  const rebuildRef = useRef<(() => void) | null>(null);

  const mouseRef = useRef<MouseState>({
    x: -9999,
    y: -9999,
    prevX: -9999,
    prevY: -9999,
    speed: 0,
  });

  const sizeRef = useRef<FieldSize>({
    w: 0,
    h: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const glowOpacity = useRef<number>(0);
  const engagement = useRef<number>(0);

  const glowId = `dot-field-glow-${useId()}`;

  const propsRef = useRef<AnimationSettings>({
    dotRadius,
    dotSpacing,
    cursorRadius,
    cursorForce,
    bulgeOnly,
    bulgeStrength,
    sparkle,
    waveAmplitude,
    gradientFrom,
    gradientTo,
  });

  // Update animation settings without restarting the animation loop.
  useEffect(() => {
    propsRef.current = {
      dotRadius,
      dotSpacing,
      cursorRadius,
      cursorForce,
      bulgeOnly,
      bulgeStrength,
      sparkle,
      waveAmplitude,
      gradientFrom,
      gradientTo,
    };
  }, [
    dotRadius,
    dotSpacing,
    cursorRadius,
    cursorForce,
    bulgeOnly,
    bulgeStrength,
    sparkle,
    waveAmplitude,
    gradientFrom,
    gradientTo,
  ]);

  useEffect(() => {
    const canvasElement = canvasRef.current;

    if (!canvasElement) return;

    const context = canvasElement.getContext("2d", { alpha: true });
    const parentElement = canvasElement.parentElement;

    if (!context || !parentElement) return;

    // Non-null references for the nested animation functions.
    const canvas = canvasElement;
    const ctx = context;
    const parent = parentElement;
    const glowEl = glowRef.current;

    let resizeTimer: ReturnType<typeof window.setTimeout> | undefined;
    let frameCount = 0;

    function buildDots(w: number, h: number): void {
      const p = propsRef.current;
      const step = Math.max(1, p.dotRadius + p.dotSpacing);
      const cols = Math.floor(w / step);
      const rows = Math.floor(h / step);
      const padX = (w % step) / 2;
      const padY = (h % step) / 2;

      const dots: Dot[] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ax = padX + col * step + step / 2;
          const ay = padY + row * step + step / 2;

          dots.push({
            ax,
            ay,
            sx: ax,
            sy: ay,
            vx: 0,
            vy: 0,
            x: ax,
            y: ay,
          });
        }
      }

      dotsRef.current = dots;
    }

    function doResize(): void {
      const rect = parent.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = {
        w,
        h,
        offsetX: rect.left + window.scrollX,
        offsetY: rect.top + window.scrollY,
      };

      buildDots(w, h);
    }

    function resize(): void {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(doResize, 100);
    }

    function onMouseMove(event: MouseEvent): void {
      const size = sizeRef.current;
      const mouse = mouseRef.current;

      mouse.x = event.pageX - size.offsetX;
      mouse.y = event.pageY - size.offsetY;
    }

    function updateMouseSpeed(): void {
      const mouse = mouseRef.current;
      const dx = mouse.prevX - mouse.x;
      const dy = mouse.prevY - mouse.y;
      const distance = Math.hypot(dx, dy);

      mouse.speed += (distance - mouse.speed) * 0.5;

      if (mouse.speed < 0.001) {
        mouse.speed = 0;
      }

      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
    }

    function tick(): void {
      frameCount++;

      const dots = dotsRef.current;
      const mouse = mouseRef.current;
      const { w, h } = sizeRef.current;
      const p = propsRef.current;
      const time = frameCount * 0.02;

      const targetEngagement = Math.min(mouse.speed / 5, 1);

      engagement.current +=
        (targetEngagement - engagement.current) * 0.06;

      if (engagement.current < 0.001) {
        engagement.current = 0;
      }

      const eng = engagement.current;

      glowOpacity.current += (eng - glowOpacity.current) * 0.08;

      if (glowEl) {
        glowEl.setAttribute("cx", String(mouse.x));
        glowEl.setAttribute("cy", String(mouse.y));
        glowEl.style.opacity = String(glowOpacity.current);
      }

      ctx.clearRect(0, 0, w, h);

      const gradient = ctx.createLinearGradient(0, 0, w, h);

      gradient.addColorStop(0, p.gradientFrom);
      gradient.addColorStop(1, p.gradientTo);

      ctx.fillStyle = gradient;

      const radius = Math.max(0, p.cursorRadius);
      const radiusSquared = radius * radius;
      const dotDrawRadius = Math.max(0, p.dotRadius / 2);
      const isBulge = p.bulgeOnly;

      ctx.beginPath();

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Also supports TypeScript's noUncheckedIndexedAccess option.
        if (!dot) continue;

        const dx = mouse.x - dot.ax;
        const dy = mouse.y - dot.ay;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared < radiusSquared && eng > 0.01) {
          const distance = Math.sqrt(distanceSquared);
          const angle = Math.atan2(dy, dx);

          if (isBulge) {
            const influence = 1 - distance / radius;
            const push =
              influence * influence * p.bulgeStrength * eng;

            dot.sx +=
              (dot.ax - Math.cos(angle) * push - dot.sx) * 0.15;

            dot.sy +=
              (dot.ay - Math.sin(angle) * push - dot.sy) * 0.15;
          } else {
            // Avoid infinite velocity when distance is zero.
            const safeDistance = Math.max(distance, 1);
            const move =
              (500 / safeDistance) * (mouse.speed * p.cursorForce);

            dot.vx -= Math.cos(angle) * move;
            dot.vy -= Math.sin(angle) * move;
          }
        } else if (isBulge) {
          dot.sx += (dot.ax - dot.sx) * 0.1;
          dot.sy += (dot.ay - dot.sy) * 0.1;
        }

        if (!isBulge) {
          dot.vx *= 0.9;
          dot.vy *= 0.9;

          dot.x = dot.ax + dot.vx;
          dot.y = dot.ay + dot.vy;

          dot.sx += (dot.x - dot.sx) * 0.1;
          dot.sy += (dot.y - dot.sy) * 0.1;
        }

        let drawX = dot.sx;
        let drawY = dot.sy;

        if (p.waveAmplitude > 0) {
          drawY +=
            Math.sin(dot.ax * 0.03 + time) * p.waveAmplitude;

          drawX +=
            Math.cos(dot.ay * 0.03 + time * 0.7) *
            p.waveAmplitude *
            0.5;
        }

        let drawRadius = dotDrawRadius;

        if (p.sparkle) {
          const hash =
            ((i * 2654435761) ^ (frameCount >> 3)) >>> 0;

          if (hash % 100 < 3) {
            drawRadius *= 1.8;
          }
        }

        ctx.moveTo(drawX + drawRadius, drawY);
        ctx.arc(drawX, drawY, drawRadius, 0, TWO_PI);
      }

      ctx.fill();

      rafRef.current = window.requestAnimationFrame(tick);
    }

    doResize();

    const speedInterval = window.setInterval(updateMouseSpeed, 20);

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove, {
      passive: true,
    });

    rafRef.current = window.requestAnimationFrame(tick);

    rebuildRef.current = () => {
      const { w, h } = sizeRef.current;

      if (w > 0 && h > 0) {
        buildDots(w, h);
      }
    };

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      window.clearInterval(speedInterval);
      window.clearTimeout(resizeTimer);

      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);

      rebuildRef.current = null;
    };
  }, []);

  useEffect(() => {
    rebuildRef.current?.();
  }, [dotRadius, dotSpacing]);

  return (
    <div
      {...rest}
      className={["dot-field-container", className]
        .filter(Boolean)
        .join(" ")}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />

      <svg
        aria-hidden="true"
        focusable="false"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <circle
          ref={glowRef}
          cx={-9999}
          cy={-9999}
          r={Math.max(0, glowRadius)}
          fill={`url(#${glowId})`}
          style={{
            opacity: 0,
            willChange: "opacity",
          }}
        />
      </svg>
    </div>
  );
});

DotField.displayName = "DotField";

export default DotField;