const featureCards = [
  {
    title: "Reliable Warehousing",
    text: "Structured storage and handling workflows keep inventory protected and ready for rapid movement.",
  },
  {
    title: "End-to-End Fulfillment",
    text: "Integrated inventory management and order fulfillment reduce friction and improve delivery accuracy.",
  },
  {
    title: "On-Time Last-Mile Routes",
    text: "Route optimization and regional market coverage improve delivery speed and consistency.",
  },
];

export default function Page() {
  return (
    <>
      <header className="site-header" id="top">
        <div className="container header-inner">
          <a className="brand" href="#top" aria-label="TrackFlow home">
            <span className="brand-mark" aria-hidden="true">
              TF
            </span>
            <span>Track Flow</span>
          </a>

          <nav aria-label="Primary navigation">
            <ul className="nav-links">
              <li>
                <a href="#services">Header</a>
              </li>
              <li>
                <a href="#benefits">Nav</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
              <li>
                <a href="#contact">Footer</a>
              </li>
              <li>
                <a href="/application.html">Apply</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero" id="services">
          <div className="container hero-layout">
            <div>
              <span className="eyebrow">Logistics Partner</span>
              <h1>Secure warehousing and smarter last-mile delivery for growing businesses.</h1>
              <p>
                Track Flow helps companies store, process, and move products with speed and reliability. From organized
                inventory management to accurate order fulfillment and on-time delivery, we design routes and operations
                that keep your business moving forward.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="/application.html">
                  Start Your Application
                </a>
                <a className="btn btn-secondary" href="#benefits">
                  See Why Clients Choose Us
                </a>
              </div>
            </div>

            <aside className="hero-panel" aria-label="Core strengths">
              <h2>Why Track Flow</h2>
              <ul>
                <li>Secure and scalable warehousing operations</li>
                <li>Inventory visibility with smooth fulfillment workflows</li>
                <li>Fast, reliable delivery across cities and regional markets</li>
              </ul>
            </aside>
          </div>
        </section>

        <section id="benefits">
          <div className="container">
            <h2 className="section-title">Main features powered by industry experience</h2>
            <p className="section-lead">
              Our team supports major city distribution, nearby regional markets, and strategic commercial routes. We
              combine practical warehouse operations and route planning to help you scale confidently.
            </p>

            <div className="features-grid">
              {featureCards.map((card) => (
                <article key={card.title} className="feature-card">
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact" id="contact">
          <div className="container contact-wrap">
            <div>
              <h2 className="section-title">Ready to improve your logistics flow?</h2>
              <p>Connect with our team to plan a warehousing and distribution model tailored to your growth goals.</p>
              <div className="contact-links">
                <a href="mailto:hello@trackflow.com">hello@trackflow.com</a>
                <a href="tel:+18005550199">+1 (800) 555-0199</a>
              </div>
            </div>

            <a className="btn btn-primary" href="mailto:hello@trackflow.com">
              Start the Conversation
            </a>
          </div>
        </section>

        <section>
          <div className="container contact-wrap">
            <div>
              <h2 className="section-title">Looking for a custom logistics setup?</h2>
              <p>
                Complete a quick application so our operations team can review your needs and propose the right
                warehousing and delivery plan.
              </p>
            </div>

            <a className="btn btn-primary" href="/application.html">
              Open Application Form
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p>Track Flow Logistics Solutions</p>
          <p className="motto">Faster routes, smarter deliveries</p>
          <p>© 2026 Track Flow. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
