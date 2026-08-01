'use client';

import type { ReactNode } from 'react';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { logout } from '../../services/httpClient';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cerrar sesion
          </button>
        </div>
        {children}
      </div>
    </ProtectedRoute>
  );
}
