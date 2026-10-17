// app/register/page.tsx — Página de registro
//
// Renderiza el formulario de registro.
// Ruta PÚBLICA — no requiere autenticación.

import RegisterForm from "@/components/register-form";

export default function RegisterPage() {
  return <RegisterForm />;
}