"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Leemos el token del localStorage, que es donde nuestro sistema de auth lo guarda
    const token = localStorage.getItem("access_token");
    
    // Si no hay token y estamos intentando acceder a una ruta de inventario, redirigimos
    if (!token && pathname.startsWith("/inventory")) {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // Mientras verificamos el estado, evitamos un parpadeo de contenido no autorizado
  if (isAuthenticated === null) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Verificando sesión...</div>;
  }

  return <>{children}</>;
}
