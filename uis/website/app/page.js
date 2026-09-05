const services = [
  {
    title: "Warehousing and Inventory Visibility",
    text: "Real-time stock handling across Los Angeles and Zaragoza so brands can scale without blind spots.",
  },
  {
    title: "Order Fulfillment and Last-Mile Delivery",
    text: "Pick, pack, and dispatch operations optimized for speed, reliability, and route efficiency.",
  },
  {
    title: "Reverse Logistics",
    text: "Structured returns intake, inspection, and disposition workflows to recover value and reduce friction.",
  },
];

const countries = [
  {
    country: "United States",
    city: "Los Angeles",
    focus: "Warehouse operations, carrier orchestration, and B2B/B2C support coverage.",
  },
  {
    country: "Spain",
    city: "Zaragoza",
    focus: "Technology operations, warehouse execution, and cross-country process standardization.",
  },
];

const priorities = [
  "Unified inventory visibility between both warehouses",
  "Carrier recommendation by destination, weight, and urgency",
  "Automated returns approval and inspection support",
  "Real-time customer and executive logistics dashboards",
];

export default function Page() {
  return (
    <main className="site">
      <section className="hero">
        <p className="eyebrow">TrackFlow Inc.</p>
        <h1>Faster routes, smarter deliveries</h1>
        <p>
          TrackFlow helps ecommerce brands store, process, and deliver products across the United States and Spain with
          secure warehousing and dependable last-mile operations.
        </p>
      </section>

      <section className="panel">
        <h2>What We Do</h2>
        <div className="grid three">
          {services.map((item) => (
            <article key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Where We Operate</h2>
        <div className="grid two">
          {countries.map((item) => (
            <article key={item.country} className="card">
              <h3>{item.country}</h3>
              <p className="meta">Primary hub: {item.city}</p>
              <p>{item.focus}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>TrackFlow Tech Priorities</h2>
        <ul>
          {priorities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
