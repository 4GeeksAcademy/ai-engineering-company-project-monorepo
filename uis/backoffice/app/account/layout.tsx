// app/account/layout.tsx — Layout protegido para /account/*
//
// Propósito: Verificar que el usuario está autenticado
// antes de mostrar cualquier página bajo /account/.
//
// Si no hay token en localStorage → redirige a /login.
// Si hay token → renderiza el contenido normalmente.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-actions";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verificar si el usuario está autenticado
    if (!isAuthenticated()) {
      // No hay token → redirigir al login
      router.replace("/login");
    } else {
      // Hay token → permitir acceso
      setChecking(false);
    }
  }, [router]);

  // Mientras verificamos, mostrar nada o un loader
  if (checking) {
    return null;
  }

  return <>{children}</>;
}