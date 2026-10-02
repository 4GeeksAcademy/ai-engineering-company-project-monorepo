"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthPanel from "@/components/AuthPanel";
import FormField from "@/components/FormField";
import {
  AuthRequestError,
  loginUser,
  TOKEN_STORAGE_KEY,
} from "@/lib/auth";

type LoginErrors = Partial<Record<"email" | "password" | "form", string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false);
  const [passwordResetSucceeded, setPasswordResetSucceeded] = useState(false);

  useEffect(() => {
    const success = window.sessionStorage.getItem(
      "brasaland_registration_success",
    );

    if (success) {
      window.sessionStorage.removeItem("brasaland_registration_success");
      setRegistrationSucceeded(true);
    }

    const passwordReset = window.sessionStorage.getItem(
      "brasaland_password_reset_success",
    );
    if (passwordReset) {
      window.sessionStorage.removeItem("brasaland_password_reset_success");
      setPasswordResetSucceeded(true);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors: LoginErrors = {};

    if (!emailPattern.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!password) {
      nextErrors.password = "Enter your password.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const session = await loginUser(email, password);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof AuthRequestError) {
        setErrors({ ...error.fieldErrors, form: error.message });
      } else {
        setErrors({ form: "Unable to sign in. Please try again." });
      }
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPanel
      title="Welcome back"
      description="Sign in to continue to the Brasaland operations dashboard."
      alternateText="New to the backoffice?"
      alternateLabel="Create an account"
      alternateHref="/register"
    >
      {registrationSucceeded ? (
        <p
          className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
          role="status"
        >
          Account created. Sign in with your new credentials.
        </p>
      ) : null}

      {passwordResetSucceeded ? (
        <p
          className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
          role="status"
        >
          Password reset successfully. Sign in with your new password.
        </p>
      ) : null}

      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <FormField
          id="login-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          inputMode="email"
          required
          error={errors.email}
        />
        <FormField
          id="login-password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          required
          error={errors.password}
        />
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brasa-red outline-none hover:text-brasa-red-dark hover:underline focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2"
          >
            Forgot password?
          </Link>
        </div>

        {errors.form && !errors.password ? (
          <p className="text-sm text-rose-600" role="alert">
            {errors.form}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-11 w-full items-center justify-center rounded-md bg-brasa-red px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-brasa-red-dark focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthPanel>
  );
}