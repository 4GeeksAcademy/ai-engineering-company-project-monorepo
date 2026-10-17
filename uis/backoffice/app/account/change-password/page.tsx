// app/account/change-password/page.tsx — Página de cambio de contraseña
//
// PROTEGIDA — el layout de /account verifica autenticación.
// Permite al usuario autenticado cambiar su contraseña.

import ChangePasswordForm from "@/components/change-password-form";
import PageTracker from "@/components/PageTracker";

export default function ChangePasswordPage() {
  return (
    <>
      <PageTracker page="/account/change-password" />
      <ChangePasswordForm />
    </>
  );
}