// app/forgot-password/page.tsx — Página de solicitud de restablecimiento
//
// Ruta PÚBLICA — no requiere autenticación.
// Muestra formulario para que el usuario ingrese su email
// y reciba un enlace de restablecimiento de contraseña.

import ForgotPasswordForm from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}