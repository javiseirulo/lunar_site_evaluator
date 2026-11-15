/**
 * Project mark: the astronaut over the Moon, the same icon as the browser tab (public/favicon.png).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}favicon.png`}
      alt=""
      aria-hidden
      className={className}
      draggable={false}
    />
  );
}
