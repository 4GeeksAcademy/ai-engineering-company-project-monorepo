"use client";

import { useState, useCallback, type FormEvent } from "react";
import {
  getCitiesForCountry,
  getLocationsForCountryCity,
  howFoundOptions,
  dietOptions,
} from "@/lib/locations";
import {
  validateStep1,
  validateStep2,
  emptyErrors,
  maxDobForAdults,
  type FormErrors,
} from "@/lib/validations";

export default function RegistrationForm() {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<FormErrors>(emptyErrors);
  const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form field values
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [favoriteLocation, setFavoriteLocation] = useState("");
  const [howFound, setHowFound] = useState("");
  const [dob, setDob] = useState("");
  const [terms, setTerms] = useState(false);
  const [offers, setOffers] = useState(false);
  const [diets, setDiets] = useState<string[]>([]);

  const cities = getCitiesForCountry(country);
  const locations = getLocationsForCountryCity(country, city);

  const clearErrors = useCallback(() => {
    setErrors(emptyErrors);
    setStatus(null);
  }, []);

  const handleCountryChange = useCallback((val: string) => {
    setCountry(val);
    setCity("");
    setFavoriteLocation("");
    setErrors((prev) => ({ ...prev, country: "", city: "" }));
  }, []);

  const handleCityChange = useCallback((val: string) => {
    setCity(val);
    setFavoriteLocation("");
    setErrors((prev) => ({ ...prev, city: "" }));
  }, []);

  const handleDietChange = useCallback((val: string) => {
    setDiets((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val],
    );
  }, []);

  const goToStep2 = useCallback(() => {
    clearErrors();
    const stepErrors = validateStep1({ fullName, email, phone, country, city });
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      setStatus({ type: "error", msg: "Please review the highlighted fields and try again." });
      return;
    }
    setStep(2);
  }, [fullName, email, phone, country, city, clearErrors]);

  const goToStep1 = useCallback(() => {
    clearErrors();
    setStep(1);
  }, [clearErrors]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      clearErrors();

      const s1 = validateStep1({ fullName, email, phone, country, city });
      const s2 = validateStep2({ howFound, dob, terms });

      if (Object.keys(s1).length > 0 || Object.keys(s2).length > 0) {
        if (Object.keys(s1).length > 0) setStep(1);
        else setStep(2);
        setErrors((prev) => ({ ...prev, ...s1, ...s2 }));
        setStatus({ type: "error", msg: "Please review the highlighted fields and try again." });
        return;
      }

      setSubmitted(true);
    },
    [fullName, email, phone, country, city, howFound, dob, terms, clearErrors],
  );

  const fieldClass =
    "mt-1 w-full rounded-xl border border-brasa-brown/20 bg-white px-3 py-2 text-sm focus:border-brasa-red focus:outline-none focus:ring-2 focus:ring-brasa-red/30";
  const disabledClass =
    "mt-1 w-full rounded-xl border border-brasa-brown/20 bg-white px-3 py-2 text-sm focus:border-brasa-red focus:outline-none focus:ring-2 focus:ring-brasa-red/30 disabled:cursor-not-allowed disabled:opacity-70";
  const labelClass = "block text-sm font-semibold text-brasa-brown";
  const errorClass = "mt-1 text-sm text-brasa-error";

  if (submitted) {
    return (
      <div className="rounded-2xl border border-brasa-brown/10 bg-brasa-cream-light p-6 shadow-lg">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <strong>Welcome to Brasa Points!</strong>
          <br />
          <br />
          Your registration was successful. You will receive a confirmation
          email in the next few minutes with your account details and how to
          start earning points.
          <br />
          <br />
          You can now enjoy your benefits at any of our 14 locations!
        </div>
      </div>
    );
  }

  return (
    <form
      id="brasa-points-form"
      noValidate
      onSubmit={handleSubmit}
      className="rounded-2xl border border-brasa-brown/10 bg-[#fffdf8] p-6 shadow-lg"
      aria-describedby="form-status"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-oswald text-2xl uppercase text-brasa-brown">
          Join Brasa Points
        </h3>
        <span className="rounded-full bg-brasa-gold-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#7b2f19]">
          Step {step} of 2
        </span>
      </div>

      {/* ---- Step 1 ---- */}
      {step === 1 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className={labelClass}>
              Full name *
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              aria-required="true"
              aria-invalid={!!errors.fullName}
              aria-describedby="error-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={fieldClass}
              autoComplete="name"
            />
            <p id="error-fullName" className={errorClass} aria-live="polite">
              {errors.fullName}
            </p>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby="error-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              autoComplete="email"
            />
            <p id="error-email" className={errorClass} aria-live="polite">
              {errors.email}
            </p>
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone *
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              aria-required="true"
              aria-invalid={!!errors.phone}
              aria-describedby="error-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldClass}
              autoComplete="tel"
              inputMode="tel"
              placeholder="+57 300 123 4567"
            />
            <p id="error-phone" className={errorClass} aria-live="polite">
              {errors.phone}
            </p>
          </div>

          <div>
            <label htmlFor="country" className={labelClass}>
              Country *
            </label>
            <select
              id="country"
              name="country"
              required
              aria-required="true"
              aria-invalid={!!errors.country}
              aria-describedby="error-country"
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select country</option>
              <option value="Colombia">Colombia</option>
              <option value="United States">United States</option>
            </select>
            <p id="error-country" className={errorClass} aria-live="polite">
              {errors.country}
            </p>
          </div>

          <div>
            <label htmlFor="city" className={labelClass}>
              City *
            </label>
            <select
              id="city"
              name="city"
              required
              aria-required="true"
              aria-invalid={!!errors.city}
              aria-describedby="error-city"
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={!country}
              className={disabledClass}
            >
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p id="error-city" className={errorClass} aria-live="polite">
              {errors.city}
            </p>
          </div>

          <div>
            <label htmlFor="favoriteLocation" className={labelClass}>
              Favorite Brasaland location
            </label>
            <select
              id="favoriteLocation"
              name="favoriteLocation"
              disabled={!locations.length}
              value={favoriteLocation}
              onChange={(e) => setFavoriteLocation(e.target.value)}
              className={disabledClass}
            >
              <option value="">Select location (optional)</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={goToStep2}
              className="mt-3 w-full rounded-xl bg-brasa-red px-4 py-3 text-sm font-bold uppercase tracking-wide text-brasa-cream transition hover:bg-brasa-red-dark"
            >
              Next Step
            </button>
          </div>
        </div>
      )}

      {/* ---- Step 2 ---- */}
      {step === 2 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-semibold text-brasa-brown">
              Dietary preferences
            </legend>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-brasa-text-secondary">
              {dietOptions.map((opt) => (
                <label key={opt} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={diets.includes(opt)}
                    onChange={() => handleDietChange(opt)}
                    className="h-4 w-4"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="howFound" className={labelClass}>
              How did you find us? *
            </label>
            <select
              id="howFound"
              name="howFound"
              required
              aria-required="true"
              aria-invalid={!!errors.howFound}
              aria-describedby="error-howFound"
              value={howFound}
              onChange={(e) => setHowFound(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select an option</option>
              {howFoundOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p id="error-howFound" className={errorClass} aria-live="polite">
              {errors.howFound}
            </p>
          </div>

          <div>
            <label htmlFor="dob" className={labelClass}>
              Date of birth *
            </label>
            <input
              id="dob"
              name="dob"
              type="date"
              required
              aria-required="true"
              aria-invalid={!!errors.dob}
              aria-describedby="error-dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={maxDobForAdults()}
              className={fieldClass}
            />
            <p id="error-dob" className={errorClass} aria-live="polite">
              {errors.dob}
            </p>
          </div>

          <div className="sm:col-span-2 space-y-2 text-sm text-brasa-text-secondary">
            <label className="inline-flex items-start gap-2">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                required
                aria-required="true"
                aria-invalid={!!errors.terms}
                aria-describedby="error-terms"
                className="mt-1 h-4 w-4"
              />
              <span>I accept program terms *</span>
            </label>
            <p id="error-terms" className="text-sm text-brasa-error" aria-live="polite">
              {errors.terms}
            </p>

            <label className="inline-flex items-start gap-2">
              <input
                id="offers"
                name="offers"
                type="checkbox"
                checked={offers}
                onChange={(e) => setOffers(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>I want to receive offers via email</span>
            </label>
          </div>

          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={goToStep1}
              className="rounded-xl border border-brasa-brown/25 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-wide text-brasa-brown transition hover:bg-brasa-cream-light"
            >
              Back
            </button>
            <button
              type="submit"
              className="rounded-xl bg-brasa-red px-4 py-3 text-sm font-bold uppercase tracking-wide text-brasa-cream transition hover:bg-brasa-red-dark"
            >
              Register Now
            </button>
          </div>
        </div>
      )}

      {status && (
        <p
          id="form-status"
          role="status"
          aria-live="polite"
          className={`mt-4 text-sm ${status.type === "error" ? "text-brasa-error" : "text-emerald-900"}`}
        >
          {status.msg}
        </p>
      )}
    </form>
  );
}
