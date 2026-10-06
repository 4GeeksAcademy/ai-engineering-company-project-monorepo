import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow" style={{ color: "#ffb703" }}>
            Since 2008 · Colombia + Florida
          </p>
          <h1>Brasaland</h1>
          <p className="lead">
            Grilled food that tastes the same in Medellín and Miami. This portal is the
            digital Brasa Points account for guests, and the location sales view for the
            kitchens and for Mariana.
          </p>
        </div>
      </section>
      <main className="portal-main">
        <div className="container card-grid">
          <Link className="card" href="/points">
            <p className="eyebrow">Marketing · Camila Ospina</p>
            <h2>Brasa Points</h2>
            <p>
              Sign in or look up a guest. See the points balance, visit history, and the
              reward the current tier unlocks.
            </p>
          </Link>
          <Link className="card" href="/ops/sales">
            <p className="eyebrow">Operations · Felipe · Executive · Mariana</p>
            <h2>Sales by location</h2>
            <p>
              Fourteen restaurants, one week. Amounts in COP and USD, with the illustrative
              conversion used across both markets.
            </p>
          </Link>
        </div>
      </main>
    </>
  );
}
