import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FetchError, Spinner } from "../components/AsyncState";
import { useAuth } from "../auth/AuthProvider";
import {
  ApiError,
  SUPPORT_PROMPT,
  fetchCurrentUser,
  toUserFacingMessage,
  updateMyProfile,
} from "../lib/api";
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

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadStatus, setLoadStatus] = useState<"loading" | "success" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [loadNonce, setLoadNonce] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const dirty = useRef(false);
  const loadStarted = useRef(0);
  const loadSettled = useRef(false);

  const retryLoad = useCallback(() => {
    setLoadNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let outcome: "success" | "error" = "error";
    loadStarted.current = performance.now();
    loadSettled.current = false;
    trackSection("account_profile");

    async function load() {
      setLoadStatus("loading");
      setLoadError("");
      setError("");
      try {
        const profile = await fetchCurrentUser();
        if (cancelled) {
          return;
        }
        setUser(profile);
        setName(profile?.name ?? "");
        setPhone(profile?.phone ?? "");
        setAddress(profile?.address ?? "");
        dirty.current = false;
        outcome = "success";
        flowStart("profile_edit", "shown");
        trackUiLatency("panel", "profile", "success", performance.now() - loadStarted.current);
      } catch (requestError) {
        if (!cancelled) {
          setLoadError(
            toUserFacingMessage(requestError, "Your profile could not be loaded right now."),
          );
          trackUiLatency("panel", "profile", "error", performance.now() - loadStarted.current);
        }
      } finally {
        loadSettled.current = true;
        if (!cancelled) {
          setLoadStatus(outcome);
        }
      }
    }

    void load();
    return () => {
      const duration = performance.now() - loadStarted.current;
      cancelled = true;
      if (!loadSettled.current) {
        trackUiLatency("panel", "profile", "cancelled", duration);
      }
      flowAbandon("profile_edit", "left");
    };
  }, [setUser, loadNonce]);

  function markDirty(): void {
    if (!dirty.current) {
      dirty.current = true;
      flowAdvance("profile_edit", "field_changed");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const updatedUser = await updateMyProfile({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      setUser(updatedUser);
      setName(updatedUser?.name ?? "");
      setPhone(updatedUser?.phone ?? "");
      setAddress(updatedUser?.address ?? "");
      dirty.current = false;
      setMessage("Profile updated.");
      trackAccountUpdated("profile_save", "completed", "none");
      flowComplete("profile_edit", "saved");
    } catch (requestError) {
      setError(toUserFacingMessage(requestError, "Your profile could not be saved."));
      if (requestError instanceof ApiError && requestError.status === 422) {
        const loc = validationFields(requestError.details)[0]?.loc ?? "";
        const field = loc.endsWith("name")
          ? "name"
          : loc.endsWith("phone")
            ? "phone"
            : loc.endsWith("address")
              ? "address"
              : "form";
        trackAuthFormRejected("profile", "validation", field);
        trackAccountUpdated("profile_save", "rejected", "validation");
      } else if (requestError instanceof ApiError && requestError.status === 401) {
        trackAccountUpdated("profile_save", "rejected", "unauthorized");
      } else {
        trackAccountUpdated("profile_save", "rejected", "api_error");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (loadStatus === "loading") {
    return (
      <section className="auth-card auth-card--embedded" aria-busy="true">
        <Spinner label="Loading profile…" />
      </section>
    );
  }

  if (loadStatus === "error") {
    return (
      <section className="auth-card auth-card--embedded">
        <p className="auth-card__eyebrow">Account</p>
        <h2>Profile</h2>
        <FetchError message={loadError} onRetry={retryLoad} />
      </section>
    );
  }

  return (
    <section className="auth-card auth-card--embedded">
      <p className="auth-card__eyebrow">Account</p>
      <h2>Profile</h2>
      <p className="auth-card__lead">
        Email and contact details from <code>GET /auth/me</code>. Name, phone, and
        address are saved with <code>PUT /profiles/me</code>.
      </p>
      <dl className="auth-meta">
        <div>
          <dt>Email</dt>
          <dd>{user?.email ?? "—"}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{user?.is_admin ? "admin" : "staff"}</dd>
        </div>
      </dl>
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={isSaving}>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              markDirty();
            }}
            autoComplete="name"
          />
        </label>
        <label>
          Phone
          <input
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              markDirty();
            }}
            autoComplete="tel"
            inputMode="tel"
          />
        </label>
        <label>
          Address
          <textarea
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              markDirty();
            }}
            autoComplete="street-address"
            rows={3}
          />
        </label>
        {error ? (
          <div className="auth-form__error" role="alert">
            <p>{error}</p>
            <p>
              Use Save profile to try again, or go to{" "}
              <Link to="/accessible">operations home</Link>.
            </p>
            <p className="auth-form__support">{SUPPORT_PROMPT}</p>
          </div>
        ) : null}
        {message ? <p className="auth-form__success">{message}</p> : null}
        <button type="submit" disabled={isSaving}>
          {isSaving ? (
            <span className="async-state">
              <span className="async-state__spinner" aria-hidden="true" />
              Saving…
            </span>
          ) : error ? (
            "Try again"
          ) : (
            "Save profile"
          )}
        </button>
      </form>
    </section>
  );
}
