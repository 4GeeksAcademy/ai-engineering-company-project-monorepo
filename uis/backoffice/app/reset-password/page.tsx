// app/reset-password/page.tsx — Página de restablecimiento de contraseña
//
// Ruta PÚBLICA — accesible desde el enlace del email.
// Lee el token del query string y permite establecer nueva contraseña.

import ResetPasswordForm from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}