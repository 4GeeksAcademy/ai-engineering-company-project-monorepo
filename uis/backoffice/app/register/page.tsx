"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { setToken } from "../../lib/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const loginResponse = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await loginResponse.json();

      if (!data?.access_token) {
        throw new Error("La API no devolvió un token válido.");
      }

      setToken(data.access_token);
      router.push("/account/profile");
    } catch (err) {
      console.error("Error registrando usuario:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo completar el registro.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-xl border p-6 shadow"
      >
        <h1 className="text-2xl font-bold">Create account</h1>

        <div>
          <label htmlFor="email" className="mb-1 block">
            Email
          </label>

          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block">
            Password
          </label>

          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </main>
  );
}
