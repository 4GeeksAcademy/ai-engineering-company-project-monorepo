
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuppliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const token = localStorage.getItem("brasaland_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (response.status === 401) {
          localStorage.removeItem("brasaland_token");
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("No se pudo verificar la sesión.");
        }

        if (active) setAuthorized(true);
      } catch {
        if (active) {
          setError("Error al comprobar la sesión. Inténtalo de nuevo.");
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return <main role="alert">{error}</main>;
  }

  if (!authorized) {
    return <main>Comprobando sesión...</main>;
  }

  return <>{children}</>;
}
