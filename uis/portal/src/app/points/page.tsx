import { FIXTURE_CUSTOMERS } from "@/lib/fixtures";
import { lookupCustomer } from "./actions";

export const dynamic = "force-dynamic";

export default async function PointsLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="portal-main">
      <div className="container stack">
        <div>
          <p className="eyebrow">Brasa Points</p>
          <h1>Sign in or look up</h1>
          <p className="lead">
            Use the guest id from a stamp card, or the email on the account. Points follow
            the programme rules: 10,000 COP or 10 USD earns 1 point.
          </p>
        </div>
        {error === "not-found" ? (
          <p className="alert" role="alert">
            No Brasa Points account matches that id, email, or name. Try one of the sample guests below.
          </p>
        ) : null}
        {error === "empty" ? (
          <p className="alert" role="alert">
            Enter a guest id or email to look up the account.
          </p>
        ) : null}
        <form className="lookup-form panel" action={lookupCustomer}>
          <label htmlFor="query">Guest id or email</label>
          <input
            id="query"
            name="query"
            type="text"
            autoComplete="username"
            placeholder="cus-001 or ana.morales@guest.brasaland.example"
            required
          />
          <div>
            <button className="btn" type="submit">
              Look up Brasa Points
            </button>
          </div>
        </form>
        <div>
          <p className="eyebrow">Sample guests</p>
          <div className="sample-row">
            {FIXTURE_CUSTOMERS.map((guest) => (
              <a key={guest.id} className="btn btn--quiet" href={`/points/${guest.id}`}>
                {guest.name} · {guest.market}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
