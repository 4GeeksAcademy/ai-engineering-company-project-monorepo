// app/login/page.tsx — Página de inicio de sesión
//
// Renderiza el formulario de login.
// Ruta PÚBLICA — no requiere autenticación.

import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return <LoginForm />;
}