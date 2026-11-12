import { type AccentColorConfig } from "@/components/transaction-theme";
import React from "react";

export interface AmbientGlowProps {
  accent: AccentColorConfig;
}

export const AmbientGlow = React.memo(function AmbientGlow({
  accent,
}: AmbientGlowProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Dynamic upper diffuse glow */}
      <div
        className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[680px] h-[400px] rounded-full blur-[110px] opacity-75 transition-all duration-700 ease-out"
        style={{
          background: `radial-gradient(circle, ${accent.glow} 0%, transparent 70%)`,
        }}
      />
      {/* Electric blue depth glow on the right */}
      <div
        className="absolute top-[28%] right-[8%] w-[480px] h-[360px] rounded-full blur-[120px] pointer-events-none opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(99, 155, 255, 0.16) 0%, transparent 70%)",
        }}
      />
      {/* Deep midnight ambient vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(11,18,32,0.85)_100%)]" />
    </div>
  );
});

