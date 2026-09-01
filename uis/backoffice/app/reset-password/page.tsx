// app/reset-password/page.tsx — Página de restablecimiento de contraseña
//
// Ruta PÚBLICA — accesible desde el enlace del email.
// Lee el token del query string y permite establecer nueva contraseña.

import ResetPasswordForm from "@/components/reset-password-form";
import PageTracker from "@/components/PageTracker";

export default function ResetPasswordPage() {
  return (
    <>
      <PageTracker page="/reset-password" />
      <ResetPasswordForm />
    </>
  );
}