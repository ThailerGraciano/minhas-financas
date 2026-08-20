import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
  return (
    <Loader2 
      className={`animate-spin text-primary ${className || ""}`} 
      size={size} 
    />
  );
}

export function FullPageLoader() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <LoadingSpinner size={48} />
        <p className="text-sm font-medium animate-pulse">Carregando...</p>
      </div>
    </div>
  );
}
