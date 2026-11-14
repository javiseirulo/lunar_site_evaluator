import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="box">
      <div className="box-head">Page not found</div>
      <div className="box-body">
        <p className="text-ink-muted mb-2">The page you requested could not be found.</p>
        <Link to="/" className="lnk more">
          Return to the home page
        </Link>
      </div>
    </section>
  );
}
