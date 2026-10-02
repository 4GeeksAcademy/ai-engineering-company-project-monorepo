"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { authFetch, readApiResponse } from "@/lib/auth";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmation) { setError("Your new passwords do not match."); return; }
    setLoading(true);
    try {
      const response = await authFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      await readApiResponse<{ message: string }>(response, "Unable to change your password.");
      setMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to change your password.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><section className="auth-panel"><p className="eyebrow">Account security</p><h1>Change password</h1><p>Confirm your current password before choosing a new one.</p>{error && <div className="supplier-error" role="alert">{error}</div>}{message && <p role="status">{message}</p>}<form className="auth-form" onSubmit={submit}><label>Current password<input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label>New password<input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label>Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="button" disabled={loading}>{loading ? "Updating…" : "Change password"}</button></form><Link href="/account/profile">Back to profile</Link></section></main>;
}
