// app/account/profile/page.tsx — Página de perfil del usuario
//
// Renderiza el formulario de perfil.
// Ruta PROTEGIDA por el layout de /account.

import ProfileForm from "@/components/profile-form";
import PageTracker from "@/components/PageTracker";

export default function ProfilePage() {
  return (
    <>
      <PageTracker page="/account/profile" />
      <ProfileForm />
    </>
  );
}