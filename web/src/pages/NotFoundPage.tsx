import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="m-auto p-6 text-center">
      <p className="eyebrow mb-2">404 · Permanently shadowed</p>
      <p className="text-ink-muted mb-4 text-sm">Nothing at these coordinates.</p>
      <Link to="/" className="text-accent text-sm underline-offset-4 hover:underline">
        Back to the surface
      </Link>
    </div>
  );
}
