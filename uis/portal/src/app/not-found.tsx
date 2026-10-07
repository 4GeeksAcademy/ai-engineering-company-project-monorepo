import Link from "next/link";

export default function NotFound() {
  return (
    <main className="portal-main">
      <div className="container stack">
        <h1>Page not found</h1>
        <p className="lead">That address is not part of the Brasaland portal.</p>
        <p>
          <Link className="btn" href="/">
            Back to the portal
          </Link>
        </p>
      </div>
    </main>
  );
}
