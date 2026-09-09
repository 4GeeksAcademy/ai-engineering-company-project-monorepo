// app/register/page.tsx — Página de registro
//
// Renderiza el formulario de registro.
// Ruta PÚBLICA — no requiere autenticación.

import RegisterForm from "@/components/register-form";
import PageTracker from "@/components/PageTracker";

export default function RegisterPage() {
  return (
    <>
      <PageTracker page="/register" />
      <RegisterForm />
    </>
  );
}