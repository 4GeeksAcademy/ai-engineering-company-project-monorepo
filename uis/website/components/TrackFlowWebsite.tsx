import { CORE_STRENGTHS, FEATURES } from "@trackflow-content";
import { FeatureCard } from "./FeatureCard";
import { Header } from "./Header";

type TrackFlowWebsiteProps = {
  applicationHref?: string;
};

const styles = `
.trackflow-site {
  --flow-blue: #2563eb;
  --flow-blue-deep: #1b4fbb;
  --ink: #0f172a;
  --slate: #334155;
  --muted: #64748b;
  --cloud: #f8fbff;
  --card: #ffffff;
  --line: #dbeafe;
  --accent: #10b981;
  --radius: 18px;
  --shadow: 0 15px 45px rgba(37, 99, 235, 0.12);
  color: var(--ink);
  background:
    radial-gradient(circle at 10% 15%, rgba(37, 99, 235, 0.14), transparent 28%),
    radial-gradient(circle at 90% 10%, rgba(16, 185, 129, 0.1), transparent 22%),
    linear-gradient(180deg, #f0f7ff 0%, #ffffff 40%, #f8fbff 100%);
  font-family: "Manrope", "Segoe UI", sans-serif;
  line-height: 1.6;
  min-height: 100vh;
}

.trackflow-site *,
.trackflow-site *::before,
.trackflow-site *::after {
  box-sizing: border-box;
}

.trackflow-site .container {
  width: min(1120px, 92%);
  margin: 0 auto;
}

.trackflow-site .site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(248, 251, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(37, 99, 235, 0.12);
}

.trackflow-site .header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  gap: 24px;
}

.trackflow-site .brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--ink);
  font-family: "Space Grotesk", "Segoe UI", sans-serif;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.trackflow-site .brand-mark {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--flow-blue), #1d4ed8);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.24);
}

.trackflow-site .nav-links {
  display: flex;
  gap: 18px;
  list-style: none;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin: 0;
  padding: 0;
}

.trackflow-site .nav-links a {
  text-decoration: none;
  color: var(--slate);
  font-weight: 600;
  font-size: 0.95rem;
  transition: color 0.25s ease;
}

.trackflow-site .nav-links a:hover,
.trackflow-site .nav-links a:focus-visible {
  color: var(--flow-blue);
  outline: none;
}

.trackflow-site .hero {
  padding: 92px 0 72px;
  position: relative;
  overflow: hidden;
}

.trackflow-site .hero::after {
  content: "";
  position: absolute;
  right: -80px;
  top: 18%;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: conic-gradient(from 100deg, rgba(37, 99, 235, 0.25), rgba(16, 185, 129, 0.16), rgba(37, 99, 235, 0.08));
  filter: blur(4px);
  z-index: 0;
}

.trackflow-site .hero-layout {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  align-items: center;
  gap: 36px;
  position: relative;
  z-index: 1;
}

.trackflow-site .eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--flow-blue-deep);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 18px;
}

.trackflow-site .eyebrow::before {
  content: "";
  width: 18px;
  height: 2px;
  background: var(--flow-blue);
}

.trackflow-site h1,
.trackflow-site h2,
.trackflow-site h3,
.trackflow-site p {
  margin: 0;
}

.trackflow-site h1,
.trackflow-site .section-title,
.trackflow-site .hero-panel h2,
.trackflow-site .feature-card h3 {
  font-family: "Space Grotesk", "Segoe UI", sans-serif;
}

.trackflow-site h1 {
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.1;
  margin-bottom: 16px;
  text-wrap: balance;
}

.trackflow-site .hero-copy {
  font-size: 1.08rem;
  color: var(--slate);
  max-width: 62ch;
  margin-bottom: 28px;
}

.trackflow-site .hero-actions,
.trackflow-site .contact-links {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.trackflow-site .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-weight: 700;
  padding: 13px 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.trackflow-site .btn-primary {
  background: linear-gradient(135deg, var(--flow-blue), #1d4ed8);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.28);
}

.trackflow-site .btn-primary:hover,
.trackflow-site .btn-primary:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 16px 28px rgba(37, 99, 235, 0.32);
  outline: none;
}

.trackflow-site .btn-secondary {
  color: var(--flow-blue-deep);
  border-color: rgba(37, 99, 235, 0.3);
  background: #ffffff;
}

.trackflow-site .btn-secondary:hover,
.trackflow-site .btn-secondary:focus-visible {
  background: #eff6ff;
  outline: none;
}

.trackflow-site .hero-panel {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}

.trackflow-site .hero-panel h2 {
  margin-bottom: 14px;
  font-size: 1.35rem;
}

.trackflow-site .hero-panel ul {
  list-style: none;
  display: grid;
  gap: 10px;
  color: var(--slate);
  margin: 0;
  padding: 0;
}

.trackflow-site .hero-panel li {
  padding-left: 22px;
  position: relative;
  font-weight: 600;
}

.trackflow-site .hero-panel li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
}

.trackflow-site section {
  padding: 60px 0;
}

.trackflow-site .section-title {
  font-size: clamp(1.65rem, 2.8vw, 2.35rem);
  margin-bottom: 12px;
  text-wrap: balance;
}

.trackflow-site .section-lead,
.trackflow-site .contact p,
.trackflow-site .feature-card p {
  color: var(--slate);
}

.trackflow-site .section-lead {
  margin-bottom: 28px;
  max-width: 70ch;
}

.trackflow-site .features-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.trackflow-site .feature-card {
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
  transform: translateY(12px);
  opacity: 0;
  animation: trackflow-rise 0.6s ease forwards;
}

.trackflow-site .feature-card h3 {
  margin-bottom: 10px;
  font-size: 1.12rem;
}

.trackflow-site .feature-card p {
  font-size: 0.98rem;
}

.trackflow-site .contact {
  background: linear-gradient(135deg, #e0ecff 0%, #f5fbff 100%);
  border-top: 1px solid rgba(37, 99, 235, 0.16);
  border-bottom: 1px solid rgba(37, 99, 235, 0.16);
}

.trackflow-site .contact-wrap {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 20px;
}

.trackflow-site .contact p {
  font-size: 1rem;
}

.trackflow-site .contact-links {
  margin-top: 14px;
}

.trackflow-site .contact-links a {
  color: var(--flow-blue-deep);
  font-weight: 700;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}

.trackflow-site .site-footer {
  background: #0b224f;
  color: #dbeafe;
  padding: 30px 0;
  font-size: 0.95rem;
}

.trackflow-site .footer-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.trackflow-site .motto {
  color: #93c5fd;
  font-weight: 600;
}

@keyframes trackflow-rise {
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 900px) {
  .trackflow-site .hero {
    padding-top: 72px;
  }

  .trackflow-site .hero-layout,
  .trackflow-site .contact-wrap {
    grid-template-columns: 1fr;
  }

  .trackflow-site .features-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .trackflow-site .header-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .trackflow-site .nav-links {
    width: 100%;
    justify-content: space-between;
  }

  .trackflow-site .features-grid {
    grid-template-columns: 1fr;
  }

  .trackflow-site .hero-actions,
  .trackflow-site .btn {
    width: 100%;
  }
}
`;

export function TrackFlowWebsite({
  applicationHref = "/application.html",
}: TrackFlowWebsiteProps) {
  return (
    <>
      <style>{styles}</style>
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
