"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthPanel from "@/components/AuthPanel";
import FormField from "@/components/FormField";
import { AuthRequestError, resetPassword } from "@/lib/auth";

type ResetErrors = Partial<Record<"newPassword" | "confirmPassword" | "form", string>>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<ResetErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    const nextErrors: ResetErrors = {};

    if (!token) nextErrors.form = "This reset link is invalid or incomplete.";
    if (newPassword.length < 8) {
      nextErrors.newPassword = "Password must be at least 8 characters.";
    }
    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await resetPassword(token, newPassword);
      window.sessionStorage.setItem("brasaland_password_reset_success", "true");
      router.replace("/login");
    } catch (error) {
      if (error instanceof AuthRequestError) {
        setErrors({
          newPassword: error.fieldErrors.new_password,
          form: error.message,
        });
      } else {
        setErrors({ form: "Unable to reset your password. Please try again." });
      }
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPanel
      title="Choose a new password"
      description="Your reset link is valid for 15 minutes and can only be used once."
      alternateText="Return to"
      alternateLabel="Sign in"
      alternateHref="/login"
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <FormField
          id="reset-new-password"
          name="newPassword"
          type="password"
          label="New password"
          autoComplete="new-password"
          required
          error={errors.newPassword}
        />
        <FormField
          id="reset-confirm-password"
          name="confirmPassword"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
        />
        {errors.form ? (
          <p className="text-sm text-rose-600" role="alert">
            {errors.form}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-11 w-full items-center justify-center rounded-md bg-brasa-red px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-brasa-red-dark focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </AuthPanel>
  );
}