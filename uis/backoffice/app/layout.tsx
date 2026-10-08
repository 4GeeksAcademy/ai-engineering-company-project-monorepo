import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control tower | TrackFlow",
  description: "Backoffice de onboarding y operaciones de TrackFlow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">TF</span> trackflow</Link><p className="side-label">CONTROL TOWER</p><nav><Link className="active" href="/">Resumen <span>01</span></Link><Link href="/#solicitudes">Solicitudes <span>12</span></Link><Link href="/#metricas">Metricas</Link><Link href="/incidents-analysis">Analisis de incidencias</Link></nav><div className="side-bottom"><span className="avatar">OP</span><span>Operaciones<br /><small>Admin</small></span></div></aside><main className="main-content">{children}</main></body></html>;
}
