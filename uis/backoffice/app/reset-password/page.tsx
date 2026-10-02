"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { readApiResponse } from "@/lib/auth";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) { setError("This reset link is missing its token. Request a new link."); return; }
    if (password !== confirmation) { setError("Your passwords do not match."); return; }
    setLoading(true);
    try {
      await readApiResponse<{ message: string }>(await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      }), "Unable to reset your password.");
      router.replace("/login?reset=success");
    } catch {
      setError("This reset link is invalid or expired. Request a new password reset link.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><section className="auth-panel"><p className="eyebrow">Account recovery</p><h1>Choose a new password</h1><p>Use at least 8 characters.</p>{error && <div className="supplier-error" role="alert">{error} <Link href="/forgot-password">Request a new link</Link></div>}<form className="auth-form" onSubmit={submit}><label>New password<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button className="button" disabled={loading}>{loading ? "Updating…" : "Reset password"}</button></form><Link href="/forgot-password">Request a new link</Link></section></main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="auth-page"><section className="auth-panel"><p>Loading password reset…</p></section></main>}><ResetPasswordForm /></Suspense>;
}
