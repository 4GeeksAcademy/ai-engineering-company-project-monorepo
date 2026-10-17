// app/forgot-password/page.tsx — Página de solicitud de restablecimiento
//
// Ruta PÚBLICA — no requiere autenticación.
// Muestra formulario para que el usuario ingrese su email
// y reciba un enlace de restablecimiento de contraseña.

import ForgotPasswordForm from "@/components/forgot-password-form";
import PageTracker from "@/components/PageTracker";

export default function ForgotPasswordPage() {
  return (
    <>
      <PageTracker page="/forgot-password" />
      <ForgotPasswordForm />
    </>
  );
}