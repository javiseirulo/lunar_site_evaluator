/**
 * Paper-sheet colour tokens for DOM overlays on the globe — owner: Marta (src/globe).
 * The globe sits inside `.space`, which flips text tokens to light colours; cards, forms and
 * legends over it are paper sheets, so they reset the tokens to the page's light theme.
 */
import type { CSSProperties } from 'react';

export const PAPER: CSSProperties = {
  ['--color-heading' as string]: '#1c1915',
  ['--color-ink' as string]: '#2c2822',
  ['--color-ink-muted' as string]: '#6a6256',
  ['--color-ink-faint' as string]: '#8a8174',
  ['--color-edge' as string]: '#d9d0c0',
  ['--color-line' as string]: '#d9d0c0',
  color: '#2c2822',
};
