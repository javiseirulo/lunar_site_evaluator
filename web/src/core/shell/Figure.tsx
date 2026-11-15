import type { ReactNode } from 'react';

/** A captioned public-domain picture. No agency logos or mission insignia. */
export function Figure({ src, alt, children }: { src: string; alt: string; children: ReactNode }) {
  return (
    <figure className="border-edge mt-3 border">
      <img src={src} alt={alt} className="block w-full bg-black" />
      <figcaption className="text-ink-faint px-2 py-1.5 text-[11px] leading-snug">
        {children}
      </figcaption>
    </figure>
  );
}

export const figureSrc = (file: string) => `${import.meta.env.BASE_URL}figures/${file}`;
