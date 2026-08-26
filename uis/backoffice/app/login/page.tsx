// app/login/page.tsx — Página de inicio de sesión
//
// Renderiza el formulario de login.
// Ruta PÚBLICA — no requiere autenticación.

import LoginForm from "@/components/login-form";
import PageTracker from "@/components/PageTracker";

export default function LoginPage() {
  return (
    <>
      <PageTracker page="/login" />
      <LoginForm />
    </>
  );
}