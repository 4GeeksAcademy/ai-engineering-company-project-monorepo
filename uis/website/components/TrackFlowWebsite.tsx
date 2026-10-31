import { CORE_STRENGTHS, FEATURES } from "@trackflow-content";
import { FeatureCard } from "./FeatureCard";
import { Header } from "./Header";

type TrackFlowWebsiteProps = {
  applicationHref?: string;
};

export function TrackFlowWebsite({
  applicationHref = "/application.html",
}: TrackFlowWebsiteProps) {
  return (
    <>
      <div className="trackflow-site">
        <Header applicationHref={applicationHref} />

        <main>
          <section className="hero" id="services">
            <div className="container hero-layout">
              <div>
                <span className="eyebrow">Logistics Partner</span>
                <h1>
                  Secure warehousing and smarter last-mile delivery for growing
                  businesses.
                </h1>
                <p className="hero-copy">
                  Track Flow helps companies store, process, and move products with
                  speed and reliability. From organized inventory management to
                  accurate order fulfillment and on-time delivery, we design routes
                  and operations that keep your business moving forward.
                </p>
                <div className="hero-actions">
                  <a className="btn btn-primary" href={applicationHref}>
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
                  {CORE_STRENGTHS.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </aside>
            </div>
          </section>

          <section id="benefits">
            <div className="container">
              <h2 className="section-title">
                Main features powered by industry experience
              </h2>
              <p className="section-lead">
                Our team supports major city distribution, nearby regional markets,
                and strategic commercial routes. We combine practical warehouse
                operations and route planning to help you scale confidently.
              </p>

              <div className="features-grid">
                {FEATURES.map((feature, index) => (
                  <FeatureCard
                    key={feature.title}
                    title={feature.title}
                    description={feature.description}
                    animationDelayMs={index * 120}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="contact" id="contact">
            <div className="container contact-wrap">
              <div>
                <h2 className="section-title">
                  Ready to improve your logistics flow?
                </h2>
                <p>
                  Connect with our team to plan a warehousing and distribution model
                  tailored to your growth goals.
                </p>
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
                <h2 className="section-title">
                  Looking for a custom logistics setup?
                </h2>
                <p>
                  Complete a quick application so our operations team can review your
                  needs and propose the right warehousing and delivery plan.
                </p>
              </div>

              <a className="btn btn-primary" href={applicationHref}>
                Open Application Form
              </a>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <div className="container footer-inner">
            <p>Track Flow Logistics Solutions</p>
            <p className="motto">Faster routes, smarter deliveries</p>
            <p>&copy; 2026 Track Flow. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
