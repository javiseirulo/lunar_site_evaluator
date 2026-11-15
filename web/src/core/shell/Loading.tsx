export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="box" role="status">
      <div className="box-head">{label}…</div>
      <div className="box-body flex items-center gap-2">
        <span className="bg-navy-950 border-edge relative h-2.5 w-40 overflow-hidden border">
          <span className="bg-navy-500 absolute inset-y-0 left-0 w-1/3 animate-pulse" />
        </span>
        <span className="text-ink-muted">Please wait</span>
      </div>
    </div>
  );
}
