import { cn } from "@/lib/utils";
import Image from "next/image";

export type BrandLogoVariant =
  | "icon"
  | "horizontal"
  | "mobile"
  | "stacked"
  | "monochrome"
  | "simplified";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  iconSize?: number;
  showSubtitle?: boolean;
}

export function BrandLogo({
  variant = "horizontal",
  className,
  iconSize,
  showSubtitle = true,
}: BrandLogoProps) {
  if (variant === "icon") {
    const size = iconSize ?? 40;
    return (
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1A092B]/90 via-[#0E0518]/95 to-[#08030E] border border-[#BA42FF]/30 shadow-[0_0_20px_-4px_rgba(150,40,250,0.45),inset_0_1px_1px_rgba(255,255,255,0.12)] select-none shrink-0",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.svg"
          alt="TGF | Minhas Finanças"
          width={Math.round(size * 0.76)}
          height={Math.round(size * 0.76)}
          className="object-contain drop-shadow-[0_0_8px_rgba(186,66,255,0.45)]"
          priority
        />
      </div>
    );
  }

  if (variant === "monochrome") {
    const size = iconSize ?? 36;
    return (
      <div className={cn("relative flex items-center justify-center select-none shrink-0", className)}>
        <Image
          src="/logo-mono.svg"
          alt="TGF Monocromático"
          width={size}
          height={size}
          className="object-contain"
          priority
        />
      </div>
    );
  }

  if (variant === "simplified") {
    return (
      <div className={cn("flex items-center gap-3 select-none", className)}>
        <div className="h-8 w-[1.5px] rounded-full bg-gradient-to-b from-[#BA42FF]/20 via-[#BA42FF]/80 to-[#5E0BE0]/20 shrink-0" />
        <div className="flex flex-col justify-center">
          <span className="text-lg font-black tracking-[0.28em] text-white leading-none">
            TGF
          </span>
          {showSubtitle && (
            <span className="text-[9px] font-semibold tracking-[0.24em] text-[#C4B5FD] uppercase mt-1 leading-none whitespace-nowrap">
              Minhas Finanças
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === "mobile") {
    const size = iconSize ?? 36;
    return (
      <div className={cn("flex items-center gap-2.5 select-none shrink-0", className)}>
        <div
          className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1A092B]/90 via-[#0E0518]/95 to-[#08030E] border border-[#BA42FF]/35 shadow-[0_0_16px_-4px_rgba(150,40,250,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)] shrink-0"
          style={{ width: size, height: size }}
        >
          <Image
            src="/logo.svg"
            alt="TGF | Minhas Finanças"
            width={Math.round(size * 0.78)}
            height={Math.round(size * 0.78)}
            className="object-contain drop-shadow-[0_0_6px_rgba(186,66,255,0.45)]"
            priority
          />
        </div>
        <span className="text-sm font-black tracking-[0.22em] text-white leading-none">
          TGF
        </span>
      </div>
    );
  }

  if (variant === "stacked") {
    const size = iconSize ?? 84;
    return (
      <div className={cn("flex flex-col items-center justify-center text-center select-none", className)}>
        <div className="relative flex items-center justify-center mb-3">
          {/* Ambient ultraviolet glow behind monogram */}
          <div className="absolute -inset-3 rounded-full bg-[#9628FA]/25 blur-xl pointer-events-none" />
          <Image
            src="/logo.svg"
            alt="TGF | Minhas Finanças"
            width={size}
            height={size}
            className="relative object-contain drop-shadow-[0_4px_18px_rgba(186,66,255,0.5)]"
            priority
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-[0.38em] pl-[0.38em] text-white leading-none drop-shadow-sm">
          TGF
        </h1>

        {showSubtitle && (
          <div className="flex items-center justify-center gap-3 mt-2.5 w-full">
            <span className="h-[1px] w-7 sm:w-9 bg-gradient-to-r from-transparent via-[#BA42FF]/70 to-[#BA42FF]" />
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-[0.32em] pl-[0.32em] text-[#C4B5FD] uppercase whitespace-nowrap">
              Minhas Finanças
            </span>
            <span className="h-[1px] w-7 sm:w-9 bg-gradient-to-l from-transparent via-[#BA42FF]/70 to-[#BA42FF]" />
          </div>
        )}
      </div>
    );
  }

  // Default: "horizontal" (Sidebar Desktop & Full Header lockup)
  const size = iconSize ?? 42;
  return (
    <div className={cn("flex items-center gap-3 select-none min-w-0", className)}>
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#1A092B]/90 via-[#0E0518]/95 to-[#08030E] border border-[#BA42FF]/35 shadow-[0_0_20px_-4px_rgba(150,40,250,0.45),inset_0_1px_1px_rgba(255,255,255,0.14)] shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.svg"
          alt="TGF | Minhas Finanças"
          width={Math.round(size * 0.78)}
          height={Math.round(size * 0.78)}
          className="object-contain drop-shadow-[0_0_8px_rgba(186,66,255,0.45)]"
          priority
        />
      </div>

      <div className="h-7 w-[1.5px] rounded-full bg-gradient-to-b from-[#BA42FF]/15 via-[#BA42FF]/75 to-[#5E0BE0]/15 shrink-0" />

      <div className="flex flex-col min-w-0 justify-center">
        <span className="text-lg font-black tracking-[0.28em] text-white leading-none truncate">
          TGF
        </span>
        {showSubtitle && (
          <span className="text-[9px] font-semibold tracking-[0.2em] text-[#C4B5FD]/90 uppercase mt-1.5 leading-none truncate">
            Minhas Finanças
          </span>
        )}
      </div>
    </div>
  );
}
