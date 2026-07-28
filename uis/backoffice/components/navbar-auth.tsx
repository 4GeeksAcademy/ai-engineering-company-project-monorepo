// components/navbar-auth.tsx — Barra de navegación con autenticación
//
// Propósito: Renderiza la navegación del backoffice incluyendo
// enlaces a rutas protegidas y botón de login/logout según el estado.
//
// Comportamiento:
// - Si el usuario está autenticado: muestra Perfil + Cerrar sesión
// - Si NO está autenticado: muestra Iniciar sesión
//
// NOTA: Este componente es "use client" porque necesita acceder a
// localStorage para verificar el token y manejar logout.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAuthenticated, logoutUser } from "@/lib/auth-actions";

export default function NavbarAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Verificar estado de autenticación al montar
    setAuthenticated(isAuthenticated());
  }, []);

  const handleLogout = () => {
    logoutUser();
    // logoutUser ya redirige a /login
  };

  return (
    <header className="border-b border-indigo-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <Link href="/" className="text-sm font-bold tracking-wide text-indigo-900">
          TrackFlow Backoffice
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <Link className="rounded-lg px-3 py-2 transition hover:bg-indigo-50" href="/">
            Inicio
          </Link>
          <Link
            className="rounded-lg px-3 py-2 transition hover:bg-indigo-50"
            href="/incidents"
          >
            Incidencias
          </Link>
          <Link
            className="rounded-lg px-3 py-2 transition hover:bg-indigo-50"
            href="/suppliers"
          >
            Proveedores
          </Link>

          {authenticated ? (
            <>
              <Link
                className="rounded-lg px-3 py-2 transition hover:bg-indigo-50"
                href="/account/profile"
              >
                Mi Perfil
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-red-200 px-3 py-2 text-red-600 transition hover:bg-red-50"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <Link
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700 transition"
              href="/login"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}