import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { ApiError, SUPPORT_PROMPT, createUserAccount, loginUser, sanitizeFieldMessage, storeToken, toUserFacingMessage } from "../lib/api";
import {
  flowAbandon,
  flowAdvance,
  flowComplete,
  flowStart,
  trackAccountUpdated,
  trackAuthFormRejected,
  trackSection,
  trackUiLatency,
  validationFields,
} from "../telemetry/events";
import "./AuthPages.css";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

function buildValidationErrors(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim() || !email.includes("@")) {
    errors.email = "A valid email is required.";
  }
  if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  return errors;
}

function mapApiValidationErrors(details: unknown): FieldErrors {
  if (typeof details === "string") {
    if (details.toLowerCase().includes("email")) {
      return { email: sanitizeFieldMessage(details) };
    }
    return {};
  }
  if (!Array.isArray(details)) {
    return {};
  }
  const errors: FieldErrors = {};
  for (const item of details) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const loc = "loc" in item ? item.loc : undefined;
    const msg = "msg" in item ? item.msg : undefined;
    const field = Array.isArray(loc) ? loc?.[loc.length - 1] : undefined;
    if (field === "email" && typeof msg === "string") {
      errors.email = sanitizeFieldMessage(msg);
    }
    if (field === "password" && typeof msg === "string") {
      errors.password = sanitizeFieldMessage(msg);
    }
    if (field === "name" && typeof msg === "string") {
      errors.name = sanitizeFieldMessage(msg);
    }
  }
  return errors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackSection("register");
    flowStart("staff_register", "shown");
    return () => {
      flowAbandon("staff_register", "left");
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const started = performance.now();
    setError("");
    const validationErrors = buildValidationErrors(email, password);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const field = validationErrors.email ? "email" : validationErrors.password ? "password" : "form";
      trackAuthFormRejected("register", "validation", field);
      trackUiLatency("form", "register_form", "error", performance.now() - started);
      return;
    }
    setIsSubmitting(true);
    flowAdvance("staff_register", "submit");
    try {
      try {
        await createUserAccount({
          email,
          password,
          name: name.trim() || undefined,
        });
      } catch (requestError) {
        setError(toUserFacingMessage(requestError, "We could not create your account. Try again."));
        if (requestError instanceof ApiError && requestError.status === 409) {
          trackAccountUpdated("register", "rejected", "duplicate_email");
        } else if (requestError instanceof ApiError && requestError.status === 422) {
          const fields = validationFields(requestError.details);
          const loc = fields[0]?.loc ?? "";
          const field = loc.endsWith("email") ? "email" : loc.endsWith("password") ? "password" : loc.endsWith("name") ? "name" : "form";
          trackAuthFormRejected("register", "validation", field);
          setFieldErrors(mapApiValidationErrors(requestError.details));
        } else {
          trackAccountUpdated("register", "rejected", "api_error");
        }
        if (requestError instanceof ApiError && requestError.status !== 422) {
          setFieldErrors(mapApiValidationErrors(requestError.details));
        }
        trackUiLatency("form", "register_form", "error", performance.now() - started);
        return;
      }
      let authResponse;
      try {
        authResponse = await loginUser(email, password);
      } catch (requestError) {
        setError(
          toUserFacingMessage(
            requestError,
            "Your account was created, but sign-in did not finish. Try signing in.",
          ),
        );
        trackUiLatency("form", "register_form", "error", performance.now() - started);
        return;
      }
      if (!authResponse?.access_token) {
        setError("Your account was created, but sign-in did not finish. Try signing in.");
        trackUiLatency("form", "register_form", "error", performance.now() - started);
        return;
      }
      storeToken(authResponse.access_token);
      try {
        await signIn(authResponse);
      } catch (requestError) {
        setError(
          toUserFacingMessage(
            requestError,
            "Your account was created, but the session could not be loaded. Try signing in.",
          ),
        );
        trackUiLatency("form", "register_form", "error", performance.now() - started);
        return;
      }
      trackAccountUpdated("register", "completed", "none");
      flowComplete("staff_register", "token_stored");
      trackUiLatency("form", "register_form", "success", performance.now() - started);
      navigate("/accessible", { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="auth-card__eyebrow">New operator</p>
        <h1>Create an account</h1>
        <p className="auth-card__lead">
          Registers with <code>POST /users</code> (name is optional), then signs in
          with <code>POST /auth/login</code> using the same credentials.
        </p>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label>
            Name <span className="auth-card__optional">(optional)</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name ? <span className="auth-form__field-error">{fieldErrors.name}</span> : null}
          </label>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              required
            />
            {fieldErrors.email ? <span className="auth-form__field-error">{fieldErrors.email}</span> : null}
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              required
            />
            {fieldErrors.password ? (
              <span className="auth-form__field-error">{fieldErrors.password}</span>
            ) : null}
          </label>
          {error ? (
            <div className="auth-form__error" role="alert">
              <p>{error}</p>
              <p>
                You can also <Link to="/login">return to login</Link>.
              </p>
              <p className="auth-form__support">{SUPPORT_PROMPT}</p>
            </div>
          ) : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="async-state">
                <span className="async-state__spinner" aria-hidden="true" />
                Creating account…
              </span>
            ) : error ? (
              "Try again"
            ) : (
              "Create account"
            )}
          </button>
        </form>
        <p className="auth-card__muted">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
