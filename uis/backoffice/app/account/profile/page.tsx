"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { apiError, authFetch } from "@/lib/auth";

type Profile = { name: string | null; phone: string | null; address: string | null };
type Me = { email: string; profile: Profile | null };

export default function ProfilePage() {
  const [user, setUser] = useState<Me | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void authFetch("/auth/me").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(apiError(body, "Unable to load your profile."));
      const me = body as Me;
      setUser(me);
      setForm({ name: me.profile?.name ?? "", phone: me.profile?.phone ?? "", address: me.profile?.address ?? "" });
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load your profile."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const response = await authFetch("/profiles/me", { method: "PUT", body: JSON.stringify({ ...form, phone: form.phone || null, address: form.address || null }) });
    const body = await response.json();
    if (!response.ok) { setError(apiError(body, "Unable to update your profile.")); return; }
    setMessage("Profile updated.");
    setUser((current) => current ? { ...current, profile: body as Profile } : current);
  }

  return <main className="auth-page"><section className="auth-panel"><p className="eyebrow">Account</p><h1>Your profile</h1>{error && <div className="supplier-error" role="alert">{error}</div>}{message && <p role="status">{message}</p>}<p>Email: <strong>{user?.email ?? "Loading…"}</strong></p><form className="auth-form" onSubmit={submit}>{(["name", "phone", "address"] as const).map((field) => <label key={field}>{field[0].toUpperCase() + field.slice(1)}<input required={field === "name"} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} /></label>)}<button className="button">Save profile</button></form><Link href="/">Return to workspace</Link></section></main>;
}
