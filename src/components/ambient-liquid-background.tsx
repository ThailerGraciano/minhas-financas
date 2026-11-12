"use client";

import { useEffect, useRef } from "react";

export function AmbientLiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    let time = 0;
    let isVisible = true;

    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let lastTime = performance.now();

    const render = (currentTime: number) => {
      if (!isVisible) return;

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      time += delta * 0.35; // Suave e fluida

      // 1. Fundo Preto Absoluto OLED (#000000)
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // 2. Caustic Glow Volumétrico de Fundo (Luz difusa ultravioleta)
      // Centro da onda orgânica flutuando suavemente
      const glowX = width * 0.52 + Math.sin(time * 0.7) * (width * 0.08);
      const glowY = height * 0.48 + Math.cos(time * 0.5) * (height * 0.06);
      const glowRadius = Math.max(width, height) * 0.55;

      const volumetricGlow = ctx.createRadialGradient(
        glowX,
        glowY,
        0,
        glowX,
        glowY,
        glowRadius
      );
      // Roxo Nubank Ultravioleta em degradê difuso
      volumetricGlow.addColorStop(0, "rgba(130, 10, 209, 0.22)");
      volumetricGlow.addColorStop(0.35, "rgba(110, 8, 179, 0.12)");
      volumetricGlow.addColorStop(0.65, "rgba(45, 4, 80, 0.05)");
      volumetricGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = volumetricGlow;
      ctx.fillRect(0, 0, width, height);

      // 3. Onda Secundária de Profundidade (Azul-Índigo / Violeta Profundo)
      const secWaveY1 = height * 0.62 + Math.sin(time * 0.6) * 35;
      const secWaveY2 = height * 0.38 + Math.cos(time * 0.8) * 45;

      ctx.beginPath();
      ctx.moveTo(-50, height * 0.75);
      ctx.bezierCurveTo(
        width * 0.3,
        secWaveY1,
        width * 0.7,
        secWaveY2,
        width + 50,
        height * 0.42
      );
      ctx.lineTo(width + 50, height + 50);
      ctx.lineTo(-50, height + 50);
      ctx.closePath();

      const secGradient = ctx.createLinearGradient(0, height * 0.35, 0, height);
      secGradient.addColorStop(0, "rgba(75, 12, 138, 0.12)");
      secGradient.addColorStop(0.5, "rgba(25, 4, 55, 0.06)");
      secGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = secGradient;
      ctx.fill();

      // 4. Onda Principal Líquida (A curva S do design)
      const p0 = { x: -60, y: height * 0.68 + Math.sin(time * 0.8) * 30 };
      const cp1 = {
        x: width * 0.35 + Math.cos(time * 0.5) * (width * 0.04),
        y: height * 0.42 + Math.sin(time * 0.9) * 40,
      };
      const cp2 = {
        x: width * 0.68 + Math.sin(time * 0.7) * (width * 0.04),
        y: height * 0.58 + Math.cos(time * 0.6) * 35,
      };
      const p3 = { x: width + 60, y: height * 0.32 + Math.cos(time * 0.85) * 30 };

      // Preenchimento volumétrico sob a onda principal
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p3.x, p3.y);
      ctx.lineTo(width + 60, height + 60);
      ctx.lineTo(-60, height + 60);
      ctx.closePath();

      const mainGradient = ctx.createLinearGradient(0, height * 0.35, 0, height);
      mainGradient.addColorStop(0, "rgba(130, 10, 209, 0.20)");
      mainGradient.addColorStop(0.3, "rgba(90, 8, 150, 0.10)");
      mainGradient.addColorStop(0.7, "rgba(35, 3, 60, 0.04)");
      mainGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = mainGradient;
      ctx.fill();

      // 5. A Crista Iluminada da Onda (Linha de Luz Especular Orgânica)
      // É essa linha curva suave que dá o impacto visual da referência
      const crestGradient = ctx.createLinearGradient(0, 0, width, height * 0.7);
      crestGradient.addColorStop(0, "rgba(130, 10, 209, 0)");
      crestGradient.addColorStop(0.2, "rgba(147, 51, 234, 0.35)");
      crestGradient.addColorStop(0.5, "rgba(216, 180, 254, 0.85)"); // Ponto de luz máxima ultravioleta
      crestGradient.addColorStop(0.75, "rgba(168, 85, 247, 0.45)");
      crestGradient.addColorStop(1, "rgba(130, 10, 209, 0)");

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p3.x, p3.y);
      ctx.strokeStyle = crestGradient;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = "rgba(168, 85, 247, 0.75)";
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();

      // 6. Segunda Linha Suave de Luz Difusa (Caustic Edge Glow)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y + 1);
      ctx.bezierCurveTo(cp1.x, cp1.y + 2, cp2.x, cp2.y + 2, p3.x, p3.y + 1);
      ctx.strokeStyle = "rgba(130, 10, 209, 0.35)";
      ctx.lineWidth = 6;
      ctx.shadowColor = "rgba(130, 10, 209, 0.9)";
      ctx.shadowBlur = 32;
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black select-none"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />
      {/* Sutil vinheta de borda para manter o foco no centro */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
    </div>
  );
}
