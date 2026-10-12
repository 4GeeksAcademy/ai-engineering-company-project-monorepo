"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "../../../lib/auth";

const API_URL = "http://127.0.0.1:8000";

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
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const userResponse = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers,
        });

        if (userResponse.status === 401) {
          clearToken();
          router.replace("/login");
          return;
        }

        if (!userResponse.ok) {
          setError("Could not load your account.");
          return;
        }

        const userData = await userResponse.json();
        setUser(userData);

        const profileResponse = await fetch(`${API_URL}/profiles/me`, {
          method: "GET",
          headers,
        });

        if (profileResponse.status === 401) {
          clearToken();
          router.replace("/login");
          return;
        }

        if (profileResponse.status === 404) {
          setProfile(null);
          return;
        }

        if (!profileResponse.ok) {
          setError("Could not load your profile.");
          return;
        }

        const profileData = await profileResponse.json();

        setProfile(profileData);
        setName(profileData.name ?? "");
        setPhone(profileData.phone ?? "");
        setAddress(profileData.address ?? "");
      } catch {
        setError("Could not connect to the server.");
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
      const response = await fetch(`${API_URL}/profiles/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          phone: phone || null,
          address: address || null,
        }),
      });

      if (response.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        setError("Could not save your profile.");
        return;
      }

      const data = await response.json();

      setProfile(data);
      setName(data.name ?? "");
      setPhone(data.phone ?? "");
      setAddress(data.address ?? "");
      setSuccess("Profile saved successfully.");
    } catch {
      setError("Could not connect to the server.");
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
        <p>Loading profile...</p>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border p-6 shadow">
          <p className="text-sm text-red-600">{error}</p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 rounded bg-black px-4 py-2 text-white"
          >
            Back to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My profile</h1>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded border px-4 py-2"
          >
            Sign out
          </button>
        </div>

        <section className="rounded-xl border p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">
            Account information
          </h2>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p>{user?.email ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p>{profile?.name ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p>{profile?.phone ?? "-"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p>{profile?.address ?? "-"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">
            Edit profile
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block">
                Name
              </label>

              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block">
                Phone
              </label>

              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded border p-2"
              />
            </div>

            <div>
              <label htmlFor="address" className="mb-1 block">
                Address
              </label>

              <input
                id="address"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="w-full rounded border p-2"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-green-600" role="status">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}