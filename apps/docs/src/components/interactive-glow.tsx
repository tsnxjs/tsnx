"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface FluidOrb {
  baseXRatio: number;
  baseYRatio: number;
  x: number;
  y: number;
  radiusFactor: number;
  color: string;
  speed: number;
  angle: number;
  distance: number;
  drag: number;
  pullFactor: number;
}

export function HeroInteractiveGlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const getDimensions = () => {
      const p = canvas.parentElement;
      const w = p ? p.offsetWidth : window.innerWidth;
      const h = p ? p.offsetHeight : 700;
      return { width: Math.max(w, 400), height: Math.max(h, 500) };
    };

    let { width, height } = getDimensions();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const dims = getDimensions();
      width = dims.width;
      height = dims.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const mouse = {
      x: width / 2,
      y: height * 0.35,
      targetX: width / 2,
      targetY: height * 0.35,
      active: false,
      hoverIntensity: 0,
    };

    const heroElement = canvas.parentElement;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inHeroX = e.clientX >= rect.left && e.clientX <= rect.right;
      const inHeroY = e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (inHeroX && inHeroY) {
        mouse.targetX = e.clientX - rect.left;
        mouse.targetY = e.clientY - rect.top;
        mouse.active = true;
      } else {
        mouse.active = false;
      }
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.targetX = width / 2;
      mouse.targetY = height * 0.35;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    if (heroElement) {
      heroElement.addEventListener("mouseleave", handleMouseLeave);
    }
    document.addEventListener("mouseleave", handleMouseLeave);

    const isDark = resolvedTheme !== "light";

    // WIDE, ATMOSPHERIC, DIFFUSED AMBIENT GLOW
    // Slowly floating, seamlessly overlapping across the upper stage
    const orbs: FluidOrb[] = [
      // 1. Broad Sapphire Horizon (Left-Center)
      {
        baseXRatio: 0.30,
        baseYRatio: 0.24,
        x: width * 0.30,
        y: height * 0.24,
        radiusFactor: 0.58,
        color: isDark ? "rgba(37, 99, 235, 0.30)" : "rgba(37, 99, 235, 0.16)",
        speed: 0.0003,
        angle: 0.2,
        distance: 140,
        drag: 0.045,
        pullFactor: 0.38,
      },
      // 2. Broad Royal Indigo / Violet Horizon (Right-Center)
      {
        baseXRatio: 0.70,
        baseYRatio: 0.28,
        x: width * 0.70,
        y: height * 0.28,
        radiusFactor: 0.62,
        color: isDark ? "rgba(124, 58, 237, 0.28)" : "rgba(124, 58, 237, 0.14)",
        speed: 0.00025,
        angle: Math.PI * 0.6,
        distance: 150,
        drag: 0.04,
        pullFactor: 0.36,
      },
      // 3. High Ethereal Cyan / Sky Blue Wash (Top Center)
      {
        baseXRatio: 0.50,
        baseYRatio: 0.10,
        x: width * 0.50,
        y: height * 0.10,
        radiusFactor: 0.52,
        color: isDark ? "rgba(14, 165, 233, 0.22)" : "rgba(14, 165, 233, 0.12)",
        speed: 0.00035,
        angle: Math.PI * 1.3,
        distance: 120,
        drag: 0.05,
        pullFactor: 0.32,
      },
      // 4. Velvet Midnight Blue Wash (Lower Center Diffusion)
      {
        baseXRatio: 0.50,
        baseYRatio: 0.46,
        x: width * 0.50,
        y: height * 0.46,
        radiusFactor: 0.68,
        color: isDark ? "rgba(30, 58, 138, 0.24)" : "rgba(59, 130, 246, 0.10)",
        speed: 0.0002,
        angle: Math.PI * 1.8,
        distance: 110,
        drag: 0.035,
        pullFactor: 0.28,
      },
    ];

    let time = 0;

    const render = () => {
      time += 0.008;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Smooth hover intensity transition (0 -> 1 when mouse is over hero)
      const targetIntensity = mouse.active ? 1 : 0;
      mouse.hoverIntensity += (targetIntensity - mouse.hoverIntensity) * 0.05;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";

      // 1. Render the main ambient fluid orbs
      orbs.forEach((orb, i) => {
        // Very slow, smooth harmonic drift
        orb.angle += orb.speed;
        const driftX = Math.cos(orb.angle) * orb.distance;
        const driftY = Math.sin(orb.angle * 0.8) * (orb.distance * 0.6);

        // Hover gravitational influence: orbs fluidly lean towards the mouse
        const baseX = width * orb.baseXRatio;
        const baseY = height * orb.baseYRatio;
        const pull = mouse.active ? orb.pullFactor : 0.03;

        const targetX = baseX + driftX + (mouse.x - baseX) * pull;
        const targetY = baseY + driftY + (mouse.y - baseY) * pull;

        orb.x += (targetX - orb.x) * orb.drag;
        orb.y += (targetY - orb.y) * orb.drag;

        // Proximity calculation: orb slightly swells when mouse is near
        const distToMouse = Math.hypot(mouse.x - orb.x, mouse.y - orb.y);
        const maxDist = Math.max(width * 0.6, 600);
        const proximity = Math.max(0, 1 - distToMouse / maxDist);
        const hoverSwell = mouse.hoverIntensity * proximity * 45;

        const baseRadius = Math.max(width * orb.radiusFactor, 500);
        const breathing = Math.sin(time + i * 1.7) * 20;
        const r = baseRadius + breathing + hoverSwell;

        const gradient = ctx.createRadialGradient(
          orb.x,
          orb.y,
          0,
          orb.x,
          orb.y,
          r
        );

        // Wide, diffuse, velvety soft dispersion
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(0.35, orb.color.replace(/[\d.]+\)$/, "0.14)"));
        gradient.addColorStop(0.70, orb.color.replace(/[\d.]+\)$/, "0.03)"));
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Interactive Soft Ambient Field directly affected by mouse hover
      if (mouse.hoverIntensity > 0.01) {
        const hoverRadius = Math.max(width * 0.38, 380);
        const hoverGrad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          hoverRadius
        );

        const alpha = mouse.hoverIntensity;
        const innerColor = isDark
          ? `rgba(59, 130, 246, ${(0.22 * alpha).toFixed(3)})`
          : `rgba(59, 130, 246, ${(0.12 * alpha).toFixed(3)})`;
        const midColor = isDark
          ? `rgba(139, 92, 246, ${(0.12 * alpha).toFixed(3)})`
          : `rgba(139, 92, 246, ${(0.06 * alpha).toFixed(3)})`;

        hoverGrad.addColorStop(0, innerColor);
        hoverGrad.addColorStop(0.45, midColor);
        hoverGrad.addColorStop(1, "transparent");

        ctx.fillStyle = hoverGrad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, hoverRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (heroElement) {
        heroElement.removeEventListener("mouseleave", handleMouseLeave);
      }
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [resolvedTheme]);

  return (
    <div className="hero-interactive-glow-wrapper" aria-hidden="true">
      <canvas ref={canvasRef} className="hero-interactive-canvas" />
    </div>
  );
}
