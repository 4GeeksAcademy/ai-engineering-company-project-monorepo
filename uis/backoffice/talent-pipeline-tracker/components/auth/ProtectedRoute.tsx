'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '../ui/Spinner';

const AUTH_TOKEN_STORAGE_KEY = 'trackflow_token';
const LOGIN_PATH = '/login';

interface ProtectedRouteProps {
  children: ReactNode;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  const tokenParts = token.split('.');

  if (tokenParts.length !== 3) {
    return null;
  }

  try {
    const normalizedPayload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(normalizedPayload);
    return JSON.parse(decodedPayload) as { exp?: number };
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  if (!token.trim()) {
    return false;
  }

  const payload = decodeJwtPayload(token);

  if (!payload) {
    return false;
  }

  if (!payload.exp) {
    return true;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null;
  const hasValidToken = Boolean(token && isTokenValid(token));

  useEffect(() => {
    if (!hasValidToken) {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      router.replace(LOGIN_PATH);
    }
  }, [hasValidToken, router]);

  if (!hasValidToken) {
    return (
      <div className="flex min-h-[calc(100vh-11rem)] items-center justify-center">
        <Spinner label="Verificando sesion..." />
      </div>
    );
  }

  return <>{children}</>;
}
