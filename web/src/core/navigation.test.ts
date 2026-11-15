import { describe, expect, it } from 'vitest';
import { AUDIENCES, visibleTabs } from './navigation';

describe('Compare is Expert-only', () => {
  it('hides the Compare tab in Normal and shows it in Expert', () => {
    expect(visibleTabs(false).some((t) => t.path === '/compare')).toBe(false);
    expect(visibleTabs(true).some((t) => t.path === '/compare')).toBe(true);
  });
  it('flags every audience shortcut to Compare as expert', () => {
    for (const a of AUDIENCES.filter((x) => x.path === '/compare')) expect(a.expert).toBe(true);
  });
});
