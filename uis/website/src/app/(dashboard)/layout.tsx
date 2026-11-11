'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0d12] text-emerald-400 font-mono text-sm">
        <p>Iniciando Nexova Command Center...</p>
      </div>
    );
  }

  const menuItems = [
    {
      name: 'Panel Overview',
      href: '/admin/panel',
      roles: ['admin', 'manager', 'user'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      name: 'Scoring IA',
      href: '/scoring',
      roles: ['admin', 'manager', 'user'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      name: 'Incidencias',
      href: '/incidents',
      roles: ['admin', 'manager', 'user'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      name: 'Tickets IT',
      href: '/admin/tickets',
      roles: ['admin', 'manager', 'user'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
      ),
    },
    {
      name: 'Proveedores',
      href: '/suppliers',
      roles: ['admin', 'manager', 'user'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      ),
    },
    {
      name: 'Soporte IA',
      href: '/support',
      roles: ['admin', 'manager', 'user'],
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ),
    },
  ];

  const userRole = typeof user?.role === 'string' ? user.role : '';
  const visibleMenuItems = menuItems.filter(
    (item) => !user || !userRole || item.roles.includes(userRole)
  );

  return (
    <div className="flex h-screen nx-spatial-bg text-slate-100 font-sans relative overflow-hidden">
      {/* Fondo animado de malla espacial 3D sobre metalizado oscuro */}
      <div className="nx-spatial-mesh" aria-hidden="true" />

      {/* Sidebar Metálico Oscuro con acentos Esmeralda */}
      <aside className="w-64 bg-[#0d1118]/90 backdrop-blur-2xl border-r border-slate-700/50 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-700 font-black text-base text-[#0a0d12] shadow-lg shadow-emerald-500/20">
            N
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white leading-none">Nexova</h2>
            <p className="text-emerald-400/85 text-[10px] mt-1 uppercase tracking-[0.2em] font-semibold">
              Command Center
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.18em] mb-3">
            Departamentos
          </p>
          {visibleMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-slate-800/60 text-emerald-300 border border-emerald-400/35 shadow-[0_0_20px_rgba(16,185,129,0.12)] font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                }`}
              >
                <span
                  className={`flex items-center justify-center transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-300'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-[#090c11]/80">
          <div className="space-y-1">
            <Link
              href="/"
              className="group flex items-center gap-3 px-4 py-2 text-xs text-slate-300 hover:text-emerald-300 transition-colors rounded-xl hover:bg-slate-800/60"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              <span className="font-medium">Web Oficial</span>
            </Link>
            <Link
              href="/account/profile"
              className="group flex items-center gap-3 px-4 py-2 text-xs text-slate-300 hover:text-emerald-300 transition-colors rounded-xl hover:bg-slate-800/60"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="font-medium">Mi Perfil</span>
            </Link>
            <button
              onClick={logout}
              className="group flex w-full items-center gap-3 px-4 py-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 transition-colors rounded-xl"
            >
              <svg className="w-4 h-4 text-rose-400 group-hover:text-rose-300 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent relative z-10">
        <header className="bg-[#11161f]/80 backdrop-blur-xl border-b border-slate-700/50 h-16 flex items-center justify-between px-8 shrink-0">
          <nav className="flex text-xs text-slate-400 font-medium" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              <li className="inline-flex items-center">
                <Link
                  href="/admin/panel"
                  className="hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Dashboard
                </Link>
              </li>
              {pathname
                .split('/')
                .filter(Boolean)
                .map((segment, index, array) => {
                  const isLast = index === array.length - 1;
                  const href = `/${array.slice(0, index + 1).join('/')}`;

                  const breadcrumbMap: Record<string, string> = {
                    admin: 'Admin',
                    panel: 'Panel Overview',
                    scoring: 'Scoring IA',
                    incidents: 'Incidencias',
                    tickets: 'Tickets IT',
                    suppliers: 'Proveedores',
                    support: 'Soporte IA',
                    account: 'Cuenta',
                    profile: 'Mi Perfil',
                  };

                  if (segment === 'admin' && array[index + 1] === 'panel') return null;

                  let label = breadcrumbMap[segment] || decodeURIComponent(segment);
                  if (!isNaN(Number(segment))) label = `Detalle #${segment}`;

                  return (
                    <li key={href}>
                      <div className="flex items-center">
                        <svg className="w-3.5 h-3.5 text-slate-600 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {isLast ? (
                          <span className="text-emerald-300 font-bold capitalize ml-1">{label}</span>
                        ) : (
                          <Link href={href} className="hover:text-emerald-400 transition-colors capitalize ml-1">
                            {label}
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ol>
          </nav>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-emerald-400/90">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NEXOVA OS · ONLINE</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
