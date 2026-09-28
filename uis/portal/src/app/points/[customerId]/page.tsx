import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceBanner } from "@/components/SourceBanner";
import { loadCustomer } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { TIERS, redemptionValue } from "@/lib/loyalty";
import { locationName } from "@/lib/locations";
import { summarizePoints } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export default async function CustomerPointsPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const loaded = await loadCustomer(customerId);
  if (!loaded.data) notFound();
  const account = loaded.data;
  const summary = summarizePoints(account);
  const redeemValue =
    summary.redeemablePoints && summary.redeemablePoints > 0
      ? formatMoney(redemptionValue(summary.redeemablePoints, account.currency), account.currency)
      : null;

  return (
    <main className="portal-main">
      <div className="container stack">
        <SourceBanner source={loaded.source} notice={loaded.notice} />
        <div>
          <p className="eyebrow">{account.loyaltyProgram}</p>
          <h1>{account.name}</h1>
          <p className="lead">
            {account.market} · home grill {locationName(account.preferredLocationId) || "not set"} ·{" "}
            {account.email}
          </p>
        </div>

        <section className="panel" aria-labelledby="balance-title">
          <p className="eyebrow" id="balance-title">
            Points balance
          </p>
          {summary.spendKnown && summary.balance !== null ? (
            <>
              <p className="balance">{summary.balance}</p>
              <p>
                {summary.tier} · {summary.reward}{" "}
                {summary.balanceSource === "stamp_card"
                  ? "Stamp-card tally from the central API (brasa_points_balance). Visit rows do not include spend, so points are not recalculated per order."
                  : `Earned ${summary.earned}, redeemed ${summary.redeemed}.`}
              </p>
              {account.usesStampCard === false ? (
                <p>This guest is not using a stamp card.</p>
              ) : null}
              <p>
                {redeemValue
                  ? `You can redeem up to ${summary.redeemablePoints} points (${redeemValue} off the bill).`
                  : "Redemption starts at 15 points, then in steps of 5."}
              </p>
            </>
          ) : (
            <p className="alert" role="status">
              This customer record lists orders but not spend, so Brasa Points cannot be calculated yet.
              The central customers API needs an amount on each visit before the balance is real.
            </p>
          )}
        </section>

        <section aria-labelledby="history-title">
          <h2 id="history-title">History</h2>
          {summary.ledger.length === 0 ? (
            <p className="lead">No visits or redemptions on this account yet.</p>
          ) : (
            <div className="table-wrap panel">
              <table>
                <caption className="eyebrow">Earn and redeem activity</caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Location</th>
                    <th>What happened</th>
                    <th className="num">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.ledger.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.occurredOn || "—"}</td>
                      <td>{locationName(entry.locationId)}</td>
                      <td>{entry.detail}</td>
                      <td className="num">
                        {entry.points === null ? "—" : entry.points > 0 ? `+${entry.points}` : entry.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="rewards-title">
          <h2 id="rewards-title">Rewards</h2>
          <div className="tier-list">
            {TIERS.map((tier) => (
              <article
                key={tier.name}
                className={summary.tier === tier.name ? "tier tier--active" : "tier"}
              >
                <h3>
                  {tier.name}
                  {summary.tier === tier.name ? " · current" : ""}
                </h3>
                <p>{tier.reward}</p>
              </article>
            ))}
          </div>
          <p className="lead" style={{ marginTop: "1rem" }}>
            Five points equal {formatMoney(20_000, "COP")} or {formatMoney(20, "USD")} off the bill.
            Points are valid in Colombia and Florida. Accounts are individual.
          </p>
        </section>

        {account.preferences.length > 0 ? (
          <p className="lead">Usual order: {account.preferences.join(", ").replaceAll("-", " ")}.</p>
        ) : null}

        <p>
          <Link href="/points">Look up a different guest</Link>
        </p>
      </div>
    </main>
  );
}
