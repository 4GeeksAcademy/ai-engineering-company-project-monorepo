import { AuthGuard } from "@/components/AuthGuard";
import { LogoutButton } from "@/components/LogoutButton";
import { NavMenu } from "@/components/NavMenu";
import { PageViewTracker } from "@/components/PageViewTracker";

// Every page in this group needs a session. The check runs in the browser
// (the token is in localStorage), so there is no middleware involved.
export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <PageViewTracker />
      <header className="topbar">
        <span className="brand">Nexova · Backoffice</span>
        <NavMenu />
        <LogoutButton />
      </header>
      {children}
    </AuthGuard>
  );
}
