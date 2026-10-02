"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { readApiResponse, saveToken } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await readApiResponse<{ access_token: string }>(response, "Unable to sign in.");
      saveToken(body.access_token);
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><section className="auth-panel"><p className="eyebrow">HealthCore Digital</p><h1>Sign in</h1><p>Access the internal operations workspace.</p>{searchParams.get("reset") === "success" && <p role="status">Password reset successfully. Sign in with your new password.</p>}{error && <div className="supplier-error" role="alert">{error}</div>}<form className="auth-form" onSubmit={submit}><label>Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="button" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form><p><a href="/forgot-password">Forgot your password?</a></p><p>Need an account? <a href="/register">Register</a></p></section></main>;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="auth-page"><section className="auth-panel"><p>Loading sign in…</p></section></main>}><LoginForm /></Suspense>;
}
