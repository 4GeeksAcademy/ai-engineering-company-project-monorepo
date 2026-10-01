"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import FormField from "@/components/FormField";
import { TOKEN_STORAGE_KEY } from "@/lib/auth";
import {
  getCurrentAccount,
  ProfileRequestError,
  updateCurrentProfile,
  type Profile,
} from "@/lib/profile";

type EditErrors = Partial<Record<"name" | "phone" | "address" | "form", string>>;

interface Account {
  email: string;
  profile: Profile;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [errors, setErrors] = useState<EditErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

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

        setErrors({
          form:
            requestError instanceof Error
              ? requestError.message
              : "Unable to load your profile.",
        });
      });

    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const nextErrors: EditErrors = {};

    if (name.length > 100) {
      nextErrors.name = "Name must be 100 characters or fewer.";
    }
    if (phone.length > 30) {
      nextErrors.phone = "Phone must be 30 characters or fewer.";
    }
    if (address.length > 255) {
      nextErrors.address = "Address must be 255 characters or fewer.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await updateCurrentProfile({
        name: name || null,
        phone: phone || null,
        address: address || null,
      });
      window.sessionStorage.setItem("brasaland_profile_updated", "true");
      router.replace("/account/profile");
    } catch (requestError) {
      if (requestError instanceof ProfileRequestError) {
        if (requestError.status === 401) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          router.replace("/login");
          return;
        }
        setErrors({ ...requestError.fieldErrors, form: requestError.message });
      } else {
        setErrors({ form: "Unable to update your profile. Please try again." });
      }
      setIsSubmitting(false);
    }
  }

  if (!account && !errors.form) {
    return <p className="text-sm text-gray-500" aria-live="polite">Loading profile...</p>;
  }

  return (
    <section className="mx-auto max-w-2xl">
      <Link
        href="/account/profile"
        className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-gray-600 outline-none hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to profile
      </Link>

      <header className="mt-6">
        <p className="text-sm font-medium text-brasa-red">Account</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-950">Edit profile</h1>
        <p className="mt-2 text-sm text-gray-600">
          Update your contact details. Your account email cannot be changed here.
        </p>
      </header>

      {account ? (
        <form
          className="mt-6 space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
          noValidate
          onSubmit={handleSubmit}
        >
          <FormField
            id="profile-email"
            label="Email"
            type="email"
            value={account.email}
            disabled
            className="opacity-75"
          />
          <FormField
            id="profile-name"
            name="name"
            label="Full name"
            autoComplete="name"
            defaultValue={account.profile.name ?? ""}
            maxLength={100}
            error={errors.name}
          />
          <FormField
            id="profile-phone"
            name="phone"
            type="tel"
            label="Phone"
            autoComplete="tel"
            defaultValue={account.profile.phone ?? ""}
            maxLength={30}
            error={errors.phone}
          />
          <FormField
            id="profile-address"
            name="address"
            label="Address"
            autoComplete="street-address"
            defaultValue={account.profile.address ?? ""}
            maxLength={255}
            error={errors.address}
          />

          {errors.form && Object.keys(errors).length === 1 ? (
            <p className="text-sm text-rose-600" role="alert">
              {errors.form}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/account/profile"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-brasa-red px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-brasa-red-dark focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-6 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          {errors.form}
        </p>
      )}
    </section>
  );
}