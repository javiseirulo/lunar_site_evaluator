/** Pure helpers for `StreetViewEmbed` (the look-only Street View other modules can host). */
import { limitLook } from './geometry';
import type { SceneOptions } from './lunarScene';
import { DEFAULT_VIEW, type ViewState } from './viewLink';

export type EmbedInteraction = 'look-only' | 'walk';

/** Why an embed gave up; the host decides what to show instead. */
export type EmbedFailure = 'no-token' | 'webgl' | 'timeout' | 'load';

/** The configured public read token, or null when the build has none (embeds never ask). */
export function embedToken(raw: string | undefined | null): string | null {
  const token = raw?.trim() ?? '';
  return token ? token : null;
}

/** Scene switches for an embed: names are hidden on request, walking only in 'walk' mode. */
export function embedSceneOptions(
  hideLabels: boolean,
  interactive: EmbedInteraction,
): Required<SceneOptions> {
  return { names: !hideLabels, walk: interactive === 'walk' };
}

/** Starting camera: the default eye height and field of view, facing `heading` (deg from N). */
export function embedInitialView(heading = 0, pitch = 0): ViewState {
  const pose = limitLook(
    Number.isFinite(heading) ? heading : 0,
    Number.isFinite(pitch) ? pitch : 0,
  );
  return { ...DEFAULT_VIEW, ...pose };
}

/** Whether this browser can create a WebGL context at all (false in tests / old devices). */
export function hasWebGL(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
