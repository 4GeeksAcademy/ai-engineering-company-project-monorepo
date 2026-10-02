"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FormField from "@/components/FormField";
import { AuthRequestError } from "@/lib/auth";
import { changePassword } from "@/lib/password";

type ChangeErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword" | "form", string>
>;

export default function ChangePasswordPage() {
  const [errors, setErrors] = useState<ChangeErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const nextErrors: ChangeErrors = {};

    if (!currentPassword) nextErrors.currentPassword = "Enter your current password.";
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
    setSucceeded(false);
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      form.reset();
      setSucceeded(true);
    } catch (error) {
      if (error instanceof AuthRequestError) {
        setErrors({
          currentPassword: error.fieldErrors.current_password,
          newPassword: error.fieldErrors.new_password,
          form: error.message,
        });
      } else {
        setErrors({ form: "Unable to change your password. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
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
        <h1 className="mt-1 text-2xl font-bold text-gray-950">Change password</h1>
        <p className="mt-2 text-sm text-gray-600">
          Confirm your current password before setting a new one.
        </p>
      </header>

      {succeeded ? (
        <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          Password changed successfully.
        </p>
      ) : null}

      <form className="mt-6 space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6" noValidate onSubmit={handleSubmit}>
        <FormField id="current-password" name="currentPassword" type="password" label="Current password" autoComplete="current-password" required error={errors.currentPassword} />
        <FormField id="new-password" name="newPassword" type="password" label="New password" autoComplete="new-password" required error={errors.newPassword} />
        <FormField id="confirm-new-password" name="confirmPassword" type="password" label="Confirm new password" autoComplete="new-password" required error={errors.confirmPassword} />
        {errors.form && Object.keys(errors).length === 1 ? (
          <p className="text-sm text-rose-600" role="alert">{errors.form}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
          <Link href="/account/profile" className="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center rounded-md bg-brasa-red px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-brasa-red-dark focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Saving..." : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}