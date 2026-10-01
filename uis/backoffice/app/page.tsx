import { Sidebar } from "@/components/sidebar";
import { departments, mapPoints, priorities } from "@/lib/workspace-data";
import { getDashboardMetrics } from "@/lib/milestone-two/dashboard-metrics";

const metrics = getDashboardMetrics();

export default function Overview() {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">
            <span>HealthCore Digital</span>
            <span aria-hidden="true">/</span>
            <strong>Overview</strong>
          </div>
          <div className="topbar-actions">
            <span className="status-dot"><i></i>Systems status</span>
            <span className="topbar-divider"></span>
            <span className="user-chip">
              <span className="avatar">HC</span>
              <span>
                <strong>Digital team</strong>
                <small>Austin team</small>
              </span>
            </span>
          </div>
        </header>

        <section className="welcome-section" aria-labelledby="welcome-heading">
          <div>
            <p className="eyebrow">Internal operations overview</p>
            <h1 id="welcome-heading">Good morning, HealthCore Digital.</h1>
            <p className="welcome-copy">A clear view of the network, so every team can spend more time on the work that matters.</p>
          </div>
          <div className="welcome-aside">
            <span className="signal-line" aria-hidden="true"></span>
            <p>
              <strong>US · UK</strong> locations
              <br />
              <span>company context · US and UK</span>
            </p>
          </div>
        </section>

        <section className="metric-grid" aria-label="Network snapshot">
          {metrics.map((metric) => (
            <article key={metric.area} className={`metric metric-${metric.tone}`}>
              <div className="metric-heading">
                <span>{metric.area}</span>
                <span className="metric-tag">{metric.tag}</span>
              </div>
              <strong>{metric.value}</strong>
              <p>{metric.label}</p>
              <small>{metric.detail}</small>
            </article>
          ))}
        </section>

        <section className="content-grid" id="priorities">
          <div className="panel priorities-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Needs attention</p>
                <h2>Today’s priorities</h2>
              </div>
              <span className="panel-count">{priorities.length} open</span>
            </div>
            <div className="priority-list">
              {priorities.map((priority) => (
                <a key={priority.title} className={`priority priority-${priority.tone}`} href={priority.href}>
                  <span className="priority-icon" aria-hidden="true">↗</span>
                  <span>
                    <strong>{priority.title}</strong>
                    <small>{priority.detail}</small>
                  </span>
                  <span className="arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>
          </div>
          <div className="panel pulse-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Company pulse</p>
                <h2>Built for access.</h2>
              </div>
              <span className="pulse-mark" aria-hidden="true">✦</span>
            </div>
            <p className="pulse-copy">HealthCore’s company briefing highlights same-day bookings, extended hours, and bilingual staff as part of its access approach.</p>
            <div className="pulse-quote">
              <span>“</span>
              <p>Accessible, high-quality care without unnecessary waits or confusing processes.</p>
            </div>
            <div className="pulse-footer">
              <span>Internal company context</span>
              <span>United States · United Kingdom</span>
            </div>
          </div>
        </section>

        <section className="section-block" id="departments">
          <div className="section-heading">
            <div>
              <p className="eyebrow">How the work connects</p>
              <h2>One company, many signals.</h2>
            </div>
            <p>Each department sees a different part of the patient journey. HealthCore Digital is building the shared view.</p>
          </div>
          <div className="department-grid">
            {departments.map((department, index) => (
              <article key={department.title} className="department-card" id={department.id}>
                <div className="department-top">
                  <span className={`department-icon ${department.iconClass}`}>{department.icon}</span>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3>{department.title}</h3>
                <p>{department.text}</p>
                <a href={department.href}>
                  {department.linkLabel} <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="location-band" id="locations">
          <div className="location-intro">
            <p className="eyebrow eyebrow-light">The network</p>
            <h2>Close to the people we serve.</h2>
            <p>HealthCore operates clinics across the United States and United Kingdom. Local processes are different; the care standard is shared.</p>
          </div>
          <div className="location-map" aria-label="HealthCore clinic footprint">
            <div className="map-line line-one"></div>
            <div className="map-line line-two"></div>
            {mapPoints.map((point) => (
              <div key={point.label} className={`map-point ${point.className}`}>
                <i></i>
                <span>{point.label}</span>
              </div>
            ))}
            <div className="map-legend">
                <strong>US · UK</strong>
              <span>
                clinic footprint
              </span>
            </div>
          </div>
        </section>

        <section className="access-strip" id="access">
          <div>
            <span className="access-symbol" aria-hidden="true">⌁</span>
            <div>
              <p className="eyebrow">Patient Experience &amp; Access</p>
              <h2>A better front door starts here.</h2>
            </div>
          </div>
          <a className="button" href="#priorities">
            Review access priorities <span aria-hidden="true">→</span>
          </a>
        </section>

        <footer className="main-footer">
          <span>HealthCore Digital · Internal operations workspace</span>
          <span>Data shown is company context, not live patient data.</span>
        </footer>
      </main>
    </div>
  );
}
