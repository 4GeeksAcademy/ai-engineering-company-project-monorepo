import { SourceBanner } from "@/components/SourceBanner";
import { loadSales } from "@/lib/api";
import { FIXTURE_WEEK } from "@/lib/fixtures";
import { ILLUSTRATIVE_USD_COP, formatMoney } from "@/lib/money";
import { chainTotals } from "@/lib/normalize";
import type { LocationSales } from "@/lib/types";

export const dynamic = "force-dynamic";

type MarketFilter = "all" | "Colombia" | "Florida";

function parseMarket(value: string | undefined): MarketFilter {
  if (value === "Colombia" || value === "Florida") return value;
  return "all";
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const { market: marketParam } = await searchParams;
  const market = parseMarket(marketParam);
  const loaded = await loadSales();
  const visible = loaded.data.filter((row) => market === "all" || row.region === market);
  const totals = chainTotals(loaded.data);
  const visibleTotals = chainTotals(visible);

  return (
    <main className="portal-main">
      <div className="container stack">
        <SourceBanner source={loaded.source} notice={loaded.notice} />
        <div>
          <p className="eyebrow">Restaurant operations · Executive</p>
          <h1>Sales by location</h1>
          <p className="lead">
            {loaded.source === "mock"
              ? `Fixture snapshot for the week starting ${FIXTURE_WEEK}.`
              : "Live sales from the central API."}{" "}
            Every location is shown in its own currency and converted so Colombia (COP) and Florida
            (USD) sit on one screen. Rate: 1 USD = {ILLUSTRATIVE_USD_COP.toLocaleString("en-US")}{" "}
            COP, illustrative only — not a live exchange feed.
          </p>
        </div>

        <section className="stat-grid" aria-label="Chain totals">
          <div className="stat">
            <span>Chain COP</span>
            <strong>{formatMoney(totals.chainCop, "COP")}</strong>
          </div>
          <div className="stat">
            <span>Chain USD</span>
            <strong>{formatMoney(totals.chainUsd, "USD")}</strong>
          </div>
          <div className="stat">
            <span>Colombia COP</span>
            <strong>{formatMoney(totals.colombiaCop, "COP")}</strong>
          </div>
          <div className="stat">
            <span>Florida USD</span>
            <strong>{formatMoney(totals.floridaUsd, "USD")}</strong>
          </div>
        </section>

        <form className="filters" method="get">
          <label htmlFor="market">Market</label>
          <select id="market" name="market" defaultValue={market}>
            <option value="all">All 14 locations</option>
            <option value="Colombia">Colombia</option>
            <option value="Florida">Florida</option>
          </select>
          <button className="btn" type="submit">
            Apply
          </button>
        </form>

        {totals.quietLocations.length === 0 ? (
          <p className="banner">No location is flagged for zero sales during opening hours this week.</p>
        ) : (
          <p className="alert" role="status">
            No sales during opening hours: {totals.quietLocations.join(", ")}.
          </p>
        )}

        {visible.length === 0 ? (
          <p className="alert" role="status">
            No locations match this market filter.
          </p>
        ) : (
          <div className="table-wrap panel">
            <table>
              <caption className="eyebrow">
                {visible.length} location{visible.length === 1 ? "" : "s"} · visible COP{" "}
                {formatMoney(visibleTotals.chainCop, "COP")} · visible USD{" "}
                {formatMoney(visibleTotals.chainUsd, "USD")}
              </caption>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Market</th>
                  <th className="num">Covers</th>
                  <th className="num">Local</th>
                  <th className="num">COP</th>
                  <th className="num">USD</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <SalesRow key={row.locationId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function SalesRow({ row }: { row: LocationSales }) {
  return (
    <tr className={row.noSalesDuringOpenHours ? "quiet-row" : undefined}>
      <td>{row.locationName}</td>
      <td>{row.region}</td>
      <td className="num">{row.covers}</td>
      <td className="num">
        {formatMoney(row.amountLocal, row.currency)}
        <span className="eyebrow"> {row.currency}</span>
      </td>
      <td className="num">{formatMoney(row.amountCop, "COP")}</td>
      <td className="num">{formatMoney(row.amountUsd, "USD")}</td>
    </tr>
  );
}
