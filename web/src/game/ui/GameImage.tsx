/**
 * <img> for Mission artwork that may not exist yet (see `assets.ts`). If the file is missing
 * or fails to load, it renders `fallback`, or by default a dark panel with an icon and a label.
 */
import { useState, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import { clsx } from 'clsx';

interface GameImageProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Text on the default placeholder (defaults to `alt`). */
  label?: string;
  /** Replaces the default placeholder; pass `null` to render nothing. */
  fallback?: ReactNode;
}

export function GameImage({ src, alt, className, label, fallback }: GameImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <div
        role="img"
        aria-label={alt}
        className={clsx(
          'flex flex-col items-center justify-center gap-1 overflow-hidden border-2 border-dashed border-edge bg-navy-950 p-2 text-center text-ink-faint',
          'bg-[repeating-linear-gradient(135deg,transparent_0_6px,#ffffff08_6px_12px)]',
          className,
        )}
      >
        <ImageOff className="size-5 shrink-0" aria-hidden />
        <span className="font-mono text-[10px] leading-tight tracking-wider uppercase">
          {label ?? alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={clsx('object-cover', className)}
      onError={() => setFailedSrc(src)}
    />
  );
}
