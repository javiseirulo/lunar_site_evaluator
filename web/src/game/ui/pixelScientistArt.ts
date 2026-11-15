/**
 * Pixel art for Dr. Regolith on a 16×16 grid: one string per row, one character per pixel,
 * `.` = transparent. Kept apart from the component so a test can check the grid.
 */
export const SCIENTIST_PALETTE: Record<string, string> = {
  h: '#d9d4c7', // grey hair
  s: '#e8b98f', // skin
  g: '#1b1b1f', // glasses frame
  l: '#8fd3ff', // glasses lens
  m: '#8a3b2e', // mouth
  w: '#f4f0e6', // lab coat
  b: '#3b6fb6', // shirt and tie
  p: '#2c2f3a', // trousers
  k: '#111114', // shoes
};

export const SCIENTIST_PIXELS: readonly string[] = [
  '....hhhhhhhh....',
  '...hhhhhhhhhh...',
  '...hssssssssh...',
  '...gllggggllg...',
  '...ssssssssss...',
  '....sssmmsss....',
  '.....ssssss.....',
  '....wwwbbwww....',
  '...wwwwbbwwww...',
  '..wwwwwbbwwwww..',
  '..swwwwbbwwwws..',
  '...wwwwbbwwww...',
  '...wwwwwwwwww...',
  '....pppppppp....',
  '....ppp..ppp....',
  '...kkkk..kkkk...',
];
