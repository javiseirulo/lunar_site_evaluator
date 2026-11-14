/**
 * Dr. Regolith, the Mission narrator: the generated portrait (`dr-regolith-talk.png`) when it
 * exists, otherwise an inline 16×16 pixel-art SVG with a gentle idle bob.
 */
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { scientistImage } from './assets';
import { GameImage } from './GameImage';
import { SCIENTIST_PALETTE, SCIENTIST_PIXELS } from './pixelScientistArt';

function PixelSvg({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Dr. Regolith, a pixel-art scientist in a lab coat and glasses"
      className={className}
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      {SCIENTIST_PIXELS.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '.' ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={SCIENTIST_PALETTE[ch]} />
          ),
        ),
      )}
    </motion.svg>
  );
}

export function PixelScientist({ className }: { className?: string }) {
  const size = clsx('size-32 sm:size-40', className);
  return (
    <GameImage
      src={scientistImage('talk')}
      alt="Dr. Regolith, the mission scientist"
      className={clsx(size, 'object-contain [image-rendering:pixelated]')}
      fallback={<PixelSvg className={size} />}
    />
  );
}
