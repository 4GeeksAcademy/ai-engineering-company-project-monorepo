import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import "./BackofficeLayout.css";
import "../pages/AuthPages.css";

const nav = [
  { to: "/accessible", label: "Accessible entry", end: true },
  { to: "/reporting/weekly-performance", label: "Monday weekly report", end: true },
  { to: "/account/profile", label: "Profile", end: true },
  { to: "/account/change-password", label: "Change password", end: true },
];

export function BackofficeLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="bo-shell">
      <aside className="bo-sidebar" aria-label="Backoffice navigation">
        <div className="bo-sidebar__brand">
          <span className="bo-sidebar__mark" aria-hidden="true" />
          <div>
            <p className="bo-sidebar__product">Brasaland Digital</p>
            <p className="bo-sidebar__role">Internal backoffice</p>
          </div>
        </div>
        <nav className="bo-sidebar__nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "bo-navlink bo-navlink--active" : "bo-navlink"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="bo-session">
          <p className="bo-session__email">{user?.name || user?.email || "Staff"}</p>
          <button type="button" className="bo-session__logout" onClick={logout}>
            Logout
          </button>
        </div>
        <p className="bo-sidebar__note">
          Separate from the public Brasaland website.
        </p>
      </aside>
      <div className="bo-main">
        <header className="bo-topbar">
          <p className="bo-topbar__eyebrow">Operations · Colombia &amp; Florida</p>
          <h1 className="bo-topbar__title">Staff console</h1>
        </header>
        <div className="bo-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
