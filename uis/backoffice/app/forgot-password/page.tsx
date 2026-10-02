"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { readApiResponse } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await readApiResponse<{ message: string }>(await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }), "Unable to request a password reset.");
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to request a password reset.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><section className="auth-panel"><p className="eyebrow">Account recovery</p><h1>Forgot password?</h1><p>Enter your work email. If it is registered, we&apos;ll send a reset link shortly.</p>{error && <div className="supplier-error" role="alert">{error}</div>}{submitted ? <p role="status">If that address is registered, you&apos;ll receive a link shortly.</p> : <form className="auth-form" onSubmit={submit}><label>Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} /></label><button className="button" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button></form>}<Link href="/login">Back to sign in</Link></section></main>;
}
