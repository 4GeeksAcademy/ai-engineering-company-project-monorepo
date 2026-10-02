"use client";

import { useState } from "react";
import AuthPanel from "@/components/AuthPanel";
import FormField from "@/components/FormField";
import { requestPasswordReset } from "@/lib/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();

    if (!emailPattern.test(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setEmailError("");
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  }

  return (
    <AuthPanel
      title="Reset your password"
      description="Enter your account email and we will send reset instructions if it matches an account."
      alternateText="Remember your password?"
      alternateLabel="Back to sign in"
      alternateHref="/login"
    >
      {isSubmitted ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
          role="status"
        >
          If an account exists for that email, a reset link has been sent. The link expires in 15 minutes.
        </div>
      ) : (
        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <FormField
            id="forgot-email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            inputMode="email"
            required
            error={emailError}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-11 w-full items-center justify-center rounded-md bg-brasa-red px-4 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-brasa-red-dark focus-visible:ring-2 focus-visible:ring-brasa-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthPanel>
  );
}