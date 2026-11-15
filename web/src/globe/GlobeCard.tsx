/**
 * Info card shown next to what was clicked on the globe — owner: Marta (src/globe).
 * Pure DOM content; GlobeCanvas places it in the 3D scene with a drei <Html>.
 */
import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEventHandler,
  type ReactNode,
} from 'react';
import { Check, Copy, MapPinPlus, Trash2, X } from 'lucide-react';
import type { Site } from '@lunar/contracts';
import { formatLatLon } from '@/core';
import type { CustomPin } from './customPins';
import { coordsForClipboard } from './geo';

export type CardContent =
  /** rank: 1–5 in the top five; summary: "Meets X of Y requirements"; note: first unmet check. */
  | { kind: 'site'; site: Site; rank: number | null; summary: string | null; note: string | null }
  | { kind: 'custom'; pin: CustomPin }
  | { kind: 'point'; lat: number; lon: number };

/**
 * The globe sits inside `.space`, which flips text tokens to light colours. Cards and forms over
 * it are paper sheets, so they reset the tokens to the page's light theme.
 */
const PAPER: CSSProperties = {
  ['--color-heading' as string]: '#ffffff',
  ['--color-ink' as string]: '#e6edf7',
  ['--color-ink-muted' as string]: '#9fb2d0',
  ['--color-ink-faint' as string]: '#7f93b5',
  ['--color-edge' as string]: '#24406e',
  ['--color-line' as string]: '#24406e',
  color: '#e6edf7',
};

/** Small paper sheet with a title row and a close button (card and pin form). */
export function Sheet({
  title,
  onClose,
  badge,
  children,
  as: Tag = 'div',
  role,
  onSubmit,
}: {
  title: string;
  onClose: () => void;
  badge?: ReactNode;
  children: ReactNode;
  as?: 'div' | 'form';
  role?: string;
  onSubmit?: FormEventHandler;
}) {
  return (
    <Tag
      className="box w-60 text-[13px] shadow-lg"
      style={PAPER}
      aria-label={title}
      role={role}
      onSubmit={onSubmit}
    >
      <div className="text-heading flex items-center gap-2 px-3 pt-2.5 pb-1">
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{title}</span>
        {badge}
        <button
          type="button"
          onClick={onClose}
          className="border-edge hover:bg-panel-2 flex size-6 shrink-0 items-center justify-center rounded-[2px] border"
          aria-label="Close"
          title="Close"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      {children}
    </Tag>
  );
}

export function GlobeCard({
  content,
  onClose,
  onCreatePin,
  onDeletePin,
}: {
  content: CardContent;
  onClose: () => void;
  onCreatePin: (lat: number, lon: number) => void;
  onDeletePin: (id: string) => void;
}) {
  const { lat, lon } =
    content.kind === 'site' ? content.site : content.kind === 'custom' ? content.pin : content;
  const title =
    content.kind === 'site'
      ? content.site.name
      : content.kind === 'custom'
        ? content.pin.name
        : 'Point on the Moon';
  const badge =
    content.kind === 'site' && content.rank !== null ? (
      <span
        className="num flex size-6 items-center justify-center rounded-full bg-warn text-[13px] font-bold text-black"
        title={`Number ${content.rank} of the top five`}
      >
        {content.rank}
      </span>
    ) : null;

  return (
    <Sheet title={title} onClose={onClose} badge={badge} role="dialog">
      <div className="flex flex-col gap-2 px-3 pb-3">
        <div className="flex items-center gap-2">
          <span className="num text-ink flex-1">{formatLatLon(lat, lon)}</span>
          <CopyButton text={coordsForClipboard(lat, lon)} />
        </div>
        {content.kind === 'site' && content.summary && (
          <p className="text-heading text-[12px] font-medium">{content.summary}</p>
        )}
        {content.kind === 'site' && content.note && (
          <p className="text-bad text-[12px]">{content.note}</p>
        )}
        {content.kind === 'site' && (
          <p className="text-ink-faint text-[12px]">Full details in the site sheet.</p>
        )}
        {content.kind === 'custom' && (
          <>
            <p className="text-ink-faint text-[12px]">
              Your pin. No sunlight or Earth data for this exact point yet.
            </p>
            <button
              type="button"
              className="btn h-[28px] self-start px-2 text-[12px]"
              onClick={() => onDeletePin(content.pin.id)}
            >
              <Trash2 className="size-3.5" aria-hidden /> Delete pin
            </button>
          </>
        )}
        {content.kind === 'point' && (
          <button
            type="button"
            className="btn btn-go h-[28px] self-start px-2 text-[12px]"
            onClick={() => onCreatePin(lat, lon)}
          >
            <MapPinPlus className="size-3.5" aria-hidden /> Create pin here
          </button>
        )}
      </div>
    </Sheet>
  );
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 1500);
    return () => clearTimeout(t);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="btn h-[28px] px-2 text-[12px]"
      title={`Copy "${text}"`}
      aria-label="Copy coordinates"
    >
      {state === 'copied' ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Failed' : 'Copy'}
    </button>
  );
}
