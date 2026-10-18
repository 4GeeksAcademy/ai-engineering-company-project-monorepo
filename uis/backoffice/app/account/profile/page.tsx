"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { clearToken, getToken } from "../../../lib/auth";

type User = {
  id?: number;
  email?: string;
};

type Profile = {
  id?: number;
  user_id?: number;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const userResponse = await api("/auth/me");

        const userData = await userResponse.json();
        setUser(userData);

        const profileResponse = await api("/profiles/me");

        if (profileResponse.status === 404) {
          setProfile(null);
          return;
        }

        const profileData = await profileResponse.json();

        setProfile(profileData);
        setName(profileData.name ?? "");
        setPhone(profileData.phone ?? "");
        setAddress(profileData.address ?? "");
      } catch (err) {
        console.error("Error cargando perfil:", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("No se pudo conectar con el servidor.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await api("/profiles/me", {
        method: "PUT",
        body: JSON.stringify({
          name,
          phone: phone || null,
          address: address || null,
        }),
      });

      const data = await response.json();

      setProfile(data);
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
      setSuccess("Perfil guardado correctamente.");
    } catch (err) {
      console.error("Error guardando perfil:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo guardar el perfil.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p>Cargando perfil...</p>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow">
          <p className="text-sm text-red-600">{error}</p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 rounded bg-black px-4 py-2 text-white"
          >
            Volver al login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">BRASALAND</p>

            <h1 className="text-3xl font-bold text-zinc-900">
              Mi perfil
            </h1>

            {user?.email && (
              <p className="mt-1 text-sm text-zinc-600">
                {user.email}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Nombre
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Teléfono
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Dirección
              </label>

              <textarea
                id="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}