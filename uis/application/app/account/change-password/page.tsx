
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const token = localStorage.getItem("brasaland_token");

    if (!token) {
      setError("Debes iniciar sesión para cambiar tu contraseña.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.status === 401) {
        throw new Error("Tu sesión ha caducado. Inicia sesión de nuevo.");
      }

      if (!response.ok) {
        throw new Error(
          response.status === 400
            ? "La contraseña actual es incorrecta."
            : "No se pudo cambiar la contraseña."
        );
      }

      setSuccess("Contraseña cambiada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error de conexión."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h1>Brasaland</h1>
      <h2>Cambiar contraseña</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="current">Contraseña actual</label>
        <input
          id="current"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <label htmlFor="new">Nueva contraseña</label>
        <input
          id="new"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <label htmlFor="confirm">Confirmar nueva contraseña</label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
        {success && <p role="status" style={{ color: "green" }}>{success}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>

      <p><Link href="/account/profile">Volver a mi perfil</Link></p>
      <p><Link href="/login">Iniciar sesión</Link></p>
    </main>
  );
}
