/**
 * Paper-sheet colour tokens for DOM overlays on the globe — owner: Marta (src/globe).
 * The globe sits inside `.space`, which flips text tokens to light colours; cards, forms and
 * legends over it are paper sheets, so they reset the tokens to the Mission navy theme (see DESIGN.md).
 */
import type { CSSProperties } from 'react';

export const PAPER: CSSProperties = {
  ['--color-heading' as string]: '#ffffff',
  ['--color-ink' as string]: '#e6edf7',
  ['--color-ink-muted' as string]: '#9fb2d0',
  ['--color-ink-faint' as string]: '#7f93b5',
  ['--color-edge' as string]: '#24406e',
  ['--color-line' as string]: '#24406e',
  color: '#e6edf7',
};
