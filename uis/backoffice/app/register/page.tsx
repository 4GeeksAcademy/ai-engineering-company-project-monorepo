"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthPanel from "@/components/AuthPanel";
import FormField from "@/components/FormField";
import {
  AuthRequestError,
  registerUser,
  type RegistrationPayload,
} from "@/lib/auth";

type RegisterField =
  | "email"
  | "password"
  | "confirmPassword"
  | "name"
  | "phone"
  | "address"
  | "form";
type RegisterErrors = Partial<Record<RegisterField, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const nextErrors: RegisterErrors = {};

    if (!emailPattern.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextErrors.password = "Create a password.";
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
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

    const payload: RegistrationPayload = { email, password };
    if (name) payload.name = name;
    if (phone) payload.phone = phone;
    if (address) payload.address = address;

    setErrors({});
    setIsSubmitting(true);

    try {
      await registerUser(payload);
      window.sessionStorage.setItem("brasaland_registration_success", "true");
      router.replace("/login");
    } catch (error) {
      if (error instanceof AuthRequestError) {
        setErrors({ ...error.fieldErrors, form: error.message });
      } else {
        setErrors({ form: "Unable to create your account. Please try again." });
      }
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPanel
      title="Create your account"
      description="Set up your credentials and add profile details for the operations team."
      alternateText="Already have an account?"
      alternateLabel="Sign in"
      alternateHref="/login"
    >
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField
            id="register-email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            inputMode="email"
            required
            error={errors.email}
          />
          <FormField
            id="register-password"
            name="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            required
            error={errors.password}
          />
          <FormField
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            required
            error={errors.confirmPassword}
          />
        </div>

        <fieldset className="space-y-4 border-t border-gray-100 pt-5">
          <legend className="px-1 text-sm font-semibold text-gray-900">
            Profile details <span className="font-normal text-gray-500">(optional)</span>
          </legend>
          <FormField
            id="register-name"
            name="name"
            label="Full name"
            autoComplete="name"
            maxLength={100}
            error={errors.name}
          />
          <FormField
            id="register-phone"
            name="phone"
            type="tel"
            label="Phone"
            autoComplete="tel"
            maxLength={30}
            error={errors.phone}
          />
          <FormField
            id="register-address"
            name="address"
            label="Address"
            autoComplete="street-address"
            maxLength={255}
            error={errors.address}
          />
        </fieldset>

        {errors.form && Object.keys(errors).length === 1 ? (
          <p className="text-sm text-rose-600" role="alert">
            {errors.form}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-11 w-full items-center justify-center rounded-md bg-brasa-red px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-brasa-red-dark focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthPanel>
  );
}