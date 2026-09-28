import Link from "next/link";

export default function CustomerNotFound() {
  return (
    <main className="portal-main">
      <div className="container stack">
        <p className="eyebrow">Brasa Points</p>
        <h1>Guest not found</h1>
        <p className="alert" role="alert">
          That id is not on the fixture accounts or the live customers API.
        </p>
        <p>
          <Link className="btn" href="/points">
            Try another lookup
          </Link>
        </p>
      </div>
    </main>
  );
}
