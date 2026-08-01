'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionToken, isTokenValid, clearSessionToken } from '../../../services/authApi';
import { Spinner } from '../ui/Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    const token = getSessionToken();

    if (!token || !isTokenValid(token)) {
      clearSessionToken();
      router.replace('/login');
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setCanRender(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [router]);

  if (!canRender) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Verificando sesion..." />
      </div>
    );
  }

  return <>{children}</>;
}
