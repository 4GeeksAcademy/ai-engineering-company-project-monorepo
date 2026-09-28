import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AsyncPanel } from "../components/AsyncState";
import { NoSalesLive } from "../components/NoSalesLive";
import {
  fetchInventory,
  fetchLocationsOverview,
  toUserFacingMessage,
  type InventoryProduct,
  type LocationsOverview,
} from "../lib/api";
import "./AccessiblePage.css";

function emptyOverview(): LocationsOverview {
  return {
    company: "Brasaland",
    total_locations: 0,
    countries: [],
    currencies: [],
    colombia_count: 0,
    florida_count: 0,
    source: "",
    locations: [],
  };
}

export function AccessiblePage() {
  const [overview, setOverview] = useState<LocationsOverview | null>(null);
  const [inventory, setInventory] = useState<InventoryProduct[] | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "success" | "error">("loading");
  const [inventoryStatus, setInventoryStatus] = useState<"loading" | "success" | "error">("loading");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [locationNonce, setLocationNonce] = useState(0);
  const [inventoryNonce, setInventoryNonce] = useState(0);

  const retryLocations = useCallback(() => {
    setLocationNonce((value) => value + 1);
  }, []);

  const retryInventory = useCallback(() => {
    setInventoryNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let outcome: "success" | "error" = "error";
    setLocationStatus("loading");
    setLocationError(null);

    void (async () => {
      try {
        const locationData = await fetchLocationsOverview();
        if (cancelled) {
          return;
        }
        setOverview({
          company: locationData?.company ?? "Brasaland",
          total_locations: locationData?.total_locations ?? 0,
          countries: locationData?.countries ?? [],
          currencies: locationData?.currencies ?? [],
          colombia_count: locationData?.colombia_count ?? 0,
          florida_count: locationData?.florida_count ?? 0,
          source: locationData?.source ?? "",
          locations: locationData?.locations ?? [],
        });
        outcome = "success";
      } catch (err: unknown) {
        if (!cancelled) {
          setOverview(null);
          setLocationError(
            toUserFacingMessage(err, "Location data could not be loaded. Try again in a moment."),
          );
        }
      } finally {
        if (!cancelled) {
          setLocationStatus(outcome);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locationNonce]);

  useEffect(() => {
    let cancelled = false;
    let outcome: "success" | "error" = "error";
    setInventoryStatus("loading");
    setInventoryError(null);

    void (async () => {
      try {
        const inventoryData = await fetchInventory();
        if (cancelled) {
          return;
        }
        setInventory(Array.isArray(inventoryData) ? inventoryData : []);
        outcome = "success";
      } catch (err: unknown) {
        if (!cancelled) {
          setInventory(null);
          setInventoryError(
            toUserFacingMessage(err, "Kitchen inventory could not be loaded. Try again in a moment."),
          );
        }
      } finally {
        if (!cancelled) {
          setInventoryStatus(outcome);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inventoryNonce]);

  const footprint = overview ?? emptyOverview();
  const roster = footprint.locations ?? [];
  const currencies = footprint.currencies ?? [];
  const stock = inventory ?? [];

  return (
    <section className="accessible" aria-labelledby="accessible-title">
      <div className="accessible__welcome">
        <p className="accessible__kicker">Protected view</p>
        <h2 id="accessible-title">Brasaland operations entry</h2>
        <p className="accessible__lead">
          Staff console for Felipe Guerrero and Mariana Restrepo. After login,
          this page loads <code>GET /locations/overview</code> (JWT required)
          and <code>GET /inventory</code> with <code>Authorization: Bearer</code>{" "}
          — 14 restaurants across Colombia and Florida, COP and USD.
        </p>
      </div>

      <NoSalesLive />

      <div className="accessible__dashboard" aria-label="Authenticated operations dashboard">
        <div className="accessible__panel accessible__panel--span">
          <h3>Company footprint</h3>
          <AsyncPanel
            status={locationStatus}
            loadingLabel="Loading protected location data…"
            error={locationError}
            onRetry={retryLocations}
            skeletonRows={3}
          >
            <dl className="accessible__stats">
              <div>
                <dt>Total locations</dt>
                <dd>{footprint.total_locations ?? 0}</dd>
              </div>
              <div>
                <dt>Colombia</dt>
                <dd>{footprint.colombia_count ?? 0}</dd>
              </div>
              <div>
                <dt>Florida (US)</dt>
                <dd>{footprint.florida_count ?? 0}</dd>
              </div>
              <div>
                <dt>Currencies</dt>
                <dd className="accessible__currencies">
                  {currencies.length === 0
                    ? "—"
                    : currencies.map((currency) => (
                        <span
                          key={currency}
                          className={
                            currency === "COP" ? "badge badge--cop" : "badge badge--usd"
                          }
                        >
                          {currency}
                        </span>
                      ))}
                </dd>
              </div>
            </dl>
            {footprint.source ? <p className="accessible__source">{footprint.source}</p> : null}
          </AsyncPanel>
        </div>

        <div className="accessible__panel">
          <h3>Location roster</h3>
          <AsyncPanel
            status={locationStatus}
            loadingLabel="Loading location roster…"
            error={locationError}
            onRetry={retryLocations}
            skeletonRows={6}
          >
            {roster.length === 0 ? (
              <p className="accessible__status">No locations were returned.</p>
            ) : (
              <ul className="accessible__list">
                {roster.map((location, index) => (
                  <li key={location?.id ?? `${location?.name ?? "location"}-${index}`}>
                    <span className="accessible__loc-name">{location?.name ?? "Unnamed location"}</span>
                    <span className="accessible__loc-meta">
                      {location?.city ?? "Unknown city"} · {location?.region ?? "Unknown region"} ·{" "}
                      <span
                        className={
                          location?.currency === "COP" ? "badge badge--cop" : "badge badge--usd"
                        }
                      >
                        {location?.currency ?? "—"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AsyncPanel>
        </div>

        <div className="accessible__panel">
          <h3>Kitchen inventory</h3>
          <AsyncPanel
            status={inventoryStatus}
            loadingLabel="Loading inventory…"
            error={inventoryError}
            onRetry={retryInventory}
            skeletonRows={5}
          >
            {stock.length === 0 ? (
              <p className="accessible__status">No products in products.csv yet.</p>
            ) : (
              <div className="accessible__table-wrap">
                <table className="accessible__table">
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Quantity</th>
                      <th scope="col">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((product, index) => (
                      <tr key={product?.product_id ?? `${product?.name ?? "item"}-${index}`}>
                        <td>{product?.name ?? "Unnamed product"}</td>
                        <td>{product?.quantity ?? "—"}</td>
                        <td>{product?.unit ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AsyncPanel>
        </div>

        <div className="accessible__panel accessible__panel--placeholder">
          <h3>Monday weekly ops &amp; finance report</h3>
          <p>
            For Mariana Restrepo, Felipe Guerrero, and Lucía Fernández —
            Purchase cost, Waste cost, Waste ratio, Stockout frequency, and
            Price alert frequency per location (COP/USD).
          </p>
          <p>
            <Link to="/reporting/weekly-performance">Open Monday weekly report</Link>
          </p>
        </div>

        <div className="accessible__panel accessible__panel--placeholder">
          <h3>Executive sales (placeholder)</h3>
          <p>
            Empty module for Mariana Restrepo’s chain sales in USD and COP —
            wired later. Structure only.
          </p>
        </div>
      </div>
    </section>
  );
}
