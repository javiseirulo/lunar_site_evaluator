import type { ReactNode } from 'react';

/** A captioned public-domain picture. No agency logos or mission insignia. */
export function Figure({
  src,
  alt,
  children,
  className = 'border-edge mt-3 border',
}: {
  src: string;
  alt: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={className}>
      <img src={src} alt={alt} className="block max-h-72 w-full bg-black object-contain" />
      <figcaption className="text-ink-muted px-2 py-2 text-[13px] leading-snug">
        {children}
      </figcaption>
    </figure>
  );
}

export const figureSrc = (file: string) => `${import.meta.env.BASE_URL}figures/${file}`;
