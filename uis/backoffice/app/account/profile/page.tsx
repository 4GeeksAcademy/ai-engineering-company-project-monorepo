"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import { TOKEN_STORAGE_KEY } from "@/lib/auth";
import {
  getCurrentAccount,
  ProfileRequestError,
  type Profile,
} from "@/lib/profile";

interface Account {
  email: string;
  profile: Profile;
}

export default function ProfilePage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [updateSucceeded, setUpdateSucceeded] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (window.sessionStorage.getItem("brasaland_profile_updated")) {
      window.sessionStorage.removeItem("brasaland_profile_updated");
      setUpdateSucceeded(true);
    }

    getCurrentAccount()
      .then((currentAccount) => {
        if (isActive) setAccount(currentAccount);
      })
      .catch((requestError: unknown) => {
        if (!isActive) return;

        if (requestError instanceof ProfileRequestError && requestError.status === 401) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          router.replace("/login");
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your profile.",
        );
      });

    return () => {
      isActive = false;
    };
  }, [router]);

  if (error) {
    return (
      <section className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-950">Account profile</h1>
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-3xl" aria-live="polite">
        <p className="text-sm text-gray-500">Loading profile...</p>
      </div>
    );
  }

  const fields = [
    { label: "Email", value: account.email, icon: Mail },
    { label: "Full name", value: account.profile.name, icon: UserRound },
    { label: "Phone", value: account.profile.phone, icon: Phone },
    { label: "Address", value: account.profile.address, icon: MapPin },
  ];

  return (
    <section className="mx-auto max-w-3xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brasa-red">Account</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">Profile</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your contact details for Brasaland operations.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Link
            href="/account/profile/edit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brasa-red px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-brasa-red-dark focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit profile
          </Link>
          <Link
            href="/account/change-password"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-gray-600 outline-none hover:bg-gray-100 hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            Change password
          </Link>
        </div>
      </header>

      {updateSucceeded ? (
        <p
          className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Profile updated successfully.
        </p>
      ) : null}

      <dl className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white px-5 shadow-sm sm:px-6">
        {fields.map(({ label, value, icon: Icon }) => (
          <div key={label} className="grid gap-2 py-5 sm:grid-cols-[180px_1fr] sm:gap-6">
            <dt className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </dt>
            <dd className="break-words text-sm text-gray-950">
              {value || <span className="text-gray-400">Not provided</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}