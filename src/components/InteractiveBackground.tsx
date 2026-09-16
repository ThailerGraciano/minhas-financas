'use client';

import { useEffect, useRef } from 'react';

export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const mouse = { x: width / 2, y: height / 2 };
    let time = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Background Base
      ctx.fillStyle = '#0B0B10';
      ctx.fillRect(0, 0, width, height);

      // Create some fluid waves using gradients
      const drawFluid = (xOffset: number, yOffset: number, size: number, color: string, speed: number) => {
        const x = width / 2 + Math.sin(time * speed) * xOffset + (mouse.x - width / 2) * 0.2;
        const y = height / 2 + Math.cos(time * speed) * yOffset + (mouse.y - height / 2) * 0.2;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      };

      // Mix #FF6B00 (Orange) and Amber reflections
      ctx.globalCompositeOperation = 'screen';
      drawFluid(200, 150, width * 0.6, 'rgba(255, 107, 0, 0.15)', 0.001);
      drawFluid(-150, 200, width * 0.5, 'rgba(255, 191, 0, 0.1)', 0.0015);
      drawFluid(100, -200, width * 0.4, 'rgba(255, 107, 0, 0.1)', 0.002);
      
      // Follow mouse more closely
      drawFluid(0, 0, width * 0.3, 'rgba(255, 150, 0, 0.08)', 0);

      time += 1;
      requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#0B0B10]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0B0B10_100%)] opacity-80 pointer-events-none" />
    </div>
  );
}
