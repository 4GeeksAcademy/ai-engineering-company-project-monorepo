"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiError, saveToken } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.email) nextErrors.email = "Email is required.";
    if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    if (!form.name) nextErrors.name = "Name is required.";
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    setLoading(true);
    setErrors({});
    try {
      const registration = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, phone: form.phone || null, address: form.address || null }) });
      const registrationBody = await registration.json();
      if (!registration.ok) throw new Error(apiError(registrationBody, "Unable to create the account."));
      const login = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, password: form.password }) });
      const loginBody = await login.json();
      if (!login.ok) throw new Error(apiError(loginBody, "Account created, but sign-in failed."));
      saveToken(loginBody.access_token);
      router.push("/");
    } catch (cause) {
      if (cause instanceof Error) setErrors({ form: cause.message });
      else setErrors({ form: "Unable to create the account." });
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><section className="auth-panel"><p className="eyebrow">HealthCore Digital</p><h1>Create account</h1><p>Set up access to the internal operations workspace.</p>{errors.form && <div className="supplier-error" role="alert">{errors.form}</div>}<form className="auth-form" onSubmit={submit}>{(["email", "password", "name", "phone", "address"] as const).map((field) => <label key={field}>{field[0].toUpperCase() + field.slice(1)}<input type={field === "email" ? "email" : field === "password" ? "password" : "text"} required={field === "email" || field === "password" || field === "name"} autoComplete={field === "password" ? "new-password" : field} value={form[field]} onChange={(event) => update(field, event.target.value)} />{errors[field] && <small role="alert">{errors[field]}</small>}</label>)}<button className="button" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button></form><p>Already registered? <a href="/login">Sign in</a></p></section></main>;
}
