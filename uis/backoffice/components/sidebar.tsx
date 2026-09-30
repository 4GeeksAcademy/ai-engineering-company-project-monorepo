"use client";

import Link from "next/link";
import { useState } from "react";
import { priorities, workspaceNav } from "@/lib/workspace-data";

export function Sidebar() {
  const [activeId, setActiveId] = useState("overview");

  return (
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="HealthCore Digital home">
        <span className="brand-mark" aria-hidden="true">+</span>
        <span>
          <strong>HealthCore</strong>
          <small>Digital workspace</small>
        </span>
      </Link>
      <div className="sidebar-section">
        <p className="sidebar-label">Patient experience</p>
        <nav className="side-nav" aria-label="Patient experience navigation">
          <Link href="/incidents" className="incident-nav-link">
            <span className="nav-icon" aria-hidden="true">▤</span>
            Incident analysis
          </Link>
          <Link href="/operations" className="incident-nav-link">
            <span className="nav-icon" aria-hidden="true">▥</span>
            Operations metrics
          </Link>
          <Link href="/suppliers" className="incident-nav-link">
            <span className="nav-icon" aria-hidden="true">▦</span>
            Supplier directory
          </Link>
        </nav>
      </div>
      {workspaceNav.map((section) => (
        <div className="sidebar-section" key={section.label}>
          <p className="sidebar-label">{section.label}</p>
          <nav className="side-nav" aria-label={section.ariaLabel}>
            {section.links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={activeId === link.id ? "active" : undefined}
                aria-current={activeId === link.id ? "location" : undefined}
                onClick={() => setActiveId(link.id)}
              >
                <span className="nav-icon" aria-hidden="true">{link.icon}</span>
                {link.label}
                {link.showPriorityCount && <b>{priorities.length}</b>}
              </a>
            ))}
          </nav>
        </div>
      ))}
      <div className="sidebar-bottom">
        <div className="compliance-note">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Privacy first</strong>
            <small>HIPAA · UK GDPR</small>
          </div>
        </div>
        <p className="sidebar-foot">
          HealthCore Digital
          <br />
          <span>Internal operations</span>
        </p>
      </div>
    </aside>
  );
}
