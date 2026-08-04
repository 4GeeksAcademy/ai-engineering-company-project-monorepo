'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarNav } from './SidebarNav';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { logout } from '../../services/authApi';

interface AppShellProps {
  children: ReactNode;
}

const PUBLIC_PATHS = new Set(['/login', '/register', '/forgot-password', '/reset-password']);

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const isPublicRoute = useMemo(() => {
    return PUBLIC_PATHS.has(pathname);
  }, [pathname]);

  if (isPublicRoute) {
    return <main className="mx-auto w-full max-w-md p-4 sm:p-6 lg:p-8">{children}</main>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-900 p-5 text-slate-100 lg:border-b-0 lg:border-r">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">TrackFlow</p>
            <h1 className="mt-2 text-lg font-semibold">Backoffice</h1>
          </div>
          <SidebarNav />
          <button
            type="button"
            onClick={logout}
            className="mt-6 inline-flex w-full justify-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
          >
            Cerrar sesión
          </button>
        </aside>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
