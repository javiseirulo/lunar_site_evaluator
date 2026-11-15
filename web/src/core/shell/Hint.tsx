import { useState } from 'react';

/**
 * Small "?" bubble that explains a term on hover, tap or keyboard focus. The bubble lines up with
 * the screen edge when the "?" sits near one, so it never runs off-screen on phones.
 */
export function Hint({ text, label = 'What does this mean?' }: { text: string; label?: string }) {
  const [align, setAlign] = useState<'center' | 'left' | 'right'>('center');
  const place = (el: HTMLElement) => {
    const { left, right } = el.getBoundingClientRect();
    setAlign(left < 130 ? 'left' : window.innerWidth - right < 130 ? 'right' : 'center');
  };
  return (
    <button
      type="button"
      className="hint"
      data-align={align}
      aria-label={`${label} ${text}`}
      onMouseEnter={(e) => place(e.currentTarget)}
      onFocus={(e) => place(e.currentTarget)}
    >
      ?<span role="tooltip">{text}</span>
    </button>
  );
}
