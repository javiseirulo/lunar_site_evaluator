export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="m-auto flex items-center gap-3 p-6" role="status">
      <span className="border-line-strong border-t-accent size-4 animate-spin rounded-full border-2" />
      <span className="eyebrow">{label}…</span>
    </div>
  );
}
