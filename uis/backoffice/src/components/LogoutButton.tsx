"use client";

import { logout } from "@/lib/auth";
import { track } from "@/lib/telemetry";

export function LogoutButton() {
  return (
    <button type="button" className="logout" onClick={() => {
        track("logout_completed", {}); // before the token goes, so the event still carries this user
        logout();
      }}>
      Cerrar sesión
    </button>
  );
}
