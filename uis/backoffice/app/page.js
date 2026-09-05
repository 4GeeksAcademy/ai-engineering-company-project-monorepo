"use client";

import { useMemo, useState } from "react";

const carrierMap = {
  us: { standard: { name: "UPS", eta: "2 to 4 business days" }, express: { name: "FedEx", eta: "1 to 2 business days" } },
  es: { standard: { name: "MRW", eta: "2 to 4 business days" }, express: { name: "SEUR", eta: "1 to 2 business days" } },
};

export default function Page() {
  const [country, setCountry] = useState("es");
  const [urgency, setUrgency] = useState("express");
  const [weight, setWeight] = useState(4);

  const plan = useMemo(() => {
    const choice = carrierMap[country][urgency];
    const crossBorderFallback = weight > 20 ? "DHL" : choice.name;
    const note = weight > 20 ? "Heavy parcel: fallback to DHL for route reliability." : "Standard assignment based on route and urgency.";

    return {
      carrier: crossBorderFallback,
      eta: choice.eta,
      warehouse: country === "us" ? "Los Angeles" : "Zaragoza",
      note,
    };
  }, [country, urgency, weight]);

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">TrackFlow Backoffice</p>
        <h1>Dispatch Planning Console</h1>
        <p>
          Internal planning surface for warehouse assignment and carrier recommendation based on destination, urgency, and parcel
          weight.
        </p>
      </header>

      <section className="panel form-grid">
        <label>
          Destination country
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="us">United States</option>
            <option value="es">Spain</option>
          </select>
        </label>

        <label>
          Urgency
          <select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
            <option value="standard">Standard</option>
            <option value="express">Express</option>
          </select>
        </label>

        <label>
          Total weight (kg)
          <input type="number" min="0.1" step="0.1" value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
        </label>
      </section>

      <section className="panel">
        <h2>Recommended Plan</h2>
        <div className="result-grid">
          <article>
            <h3>Assigned Warehouse</h3>
            <p>{plan.warehouse}</p>
          </article>
          <article>
            <h3>Recommended Carrier</h3>
            <p>{plan.carrier}</p>
          </article>
          <article>
            <h3>Expected Delivery Window</h3>
            <p>{plan.eta}</p>
          </article>
        </div>
        <p className="note">{plan.note}</p>
      </section>

      <section className="panel">
        <h2>Operations Priorities Visible in This View</h2>
        <ul>
          <li>Warehouse routing between Los Angeles and Zaragoza</li>
          <li>Carrier recommendation by country and urgency</li>
          <li>ETA assumptions for customer-facing updates</li>
        </ul>
      </section>
    </main>
  );
}
