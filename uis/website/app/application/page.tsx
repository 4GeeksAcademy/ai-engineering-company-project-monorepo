"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  experience: string;
  sector: string;
  english: string;
  availability: string;
  linkedin: string;
  comments: string;
  policy: boolean;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL_VALUES: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  experience: "",
  sector: "",
  english: "",
  availability: "",
  linkedin: "",
  comments: "",
  policy: false,
};

function validateField(name: keyof FormValues, values: FormValues): string {
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const linkedin = values.linkedin.trim();
  const experience = Number(values.experience);
  const remaining = 500 - values.comments.length;

  if (name === "fullName") {
    if (!/^\S+\s+\S+/.test(fullName)) {
      return "Name must contain at least first and last name";
    }
  }

  if (name === "email") {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return "Enter a valid email (example: name@company.com)";
    }
  }

  if (name === "phone") {
    if (!/^\+\d{1,3}\s?\d{3,}$/.test(phone)) {
      return "Phone must include country code (example: +34 612 345 678)";
    }
  }

  if (name === "country") {
    if (!values.country) {
      return "Select your country of residence";
    }
  }

  if (name === "experience") {
    if (Number.isNaN(experience) || experience < 0 || experience > 50) {
      return "Years of experience must be between 0 and 50";
    }
  }

  if (name === "sector") {
    if (!values.sector) {
      return "Select your sector of interest";
    }
  }

  if (name === "english") {
    if (!values.english) {
      return "Indicate your English level";
    }
  }

  if (name === "availability") {
    if (!values.availability) {
      return "Select your availability";
    }
  }

  if (name === "linkedin") {
    if (linkedin && !/^https?:\/\//.test(linkedin)) {
      return "If you include LinkedIn, it must be a valid URL";
    }
  }

  if (name === "comments") {
    if (values.comments.length > 500) {
      return `Comments cannot exceed 500 characters (${remaining} remaining)`;
    }
  }

  if (name === "policy") {
    if (!values.policy) {
      return "You must accept the data processing policy to continue";
    }
  }

  return "";
}

export default function ApplicationPage() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const commentsRemaining = useMemo(() => 500 - values.comments.length, [values.comments]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSuccessOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isSuccessOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isSuccessOpen]);

  function setFieldValue(name: keyof FormValues, value: string | boolean) {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function validateAndSetField(name: keyof FormValues, nextValues: FormValues) {
    const message = validateField(name, nextValues);

    setErrors((current) => ({
      ...current,
      [name]: message,
    }));
  }

  function validateAll(currentValues: FormValues): FormErrors {
    const nextErrors: FormErrors = {};

    (Object.keys(currentValues) as (keyof FormValues)[]).forEach((key) => {
      const message = validateField(key, currentValues);
      if (message) {
        nextErrors[key] = message;
      }
    });

    return nextErrors;
  }

  function handleBlur(name: keyof FormValues) {
    validateAndSetField(name, values);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateAll(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setIsSuccessOpen(false);
      return;
    }

    setValues(INITIAL_VALUES);
    setErrors({});
    setIsSuccessOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    setValues(INITIAL_VALUES);
    setErrors({});
    setIsSuccessOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-20 w-full border-b border-orange-200 bg-orange-50/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight sm:text-2xl">
            Nexova
          </Link>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-orange-900 sm:justify-end sm:space-x-6 sm:text-base md:text-lg">
            <li>
              <Link href="/#home" className="hover:text-rose-600">
                Home
              </Link>
            </li>
            <li>
              <Link href="/#services" className="hover:text-rose-600">
                Services
              </Link>
            </li>
            <li>
              <Link href="/#why" className="hover:text-rose-600">
                Talent
              </Link>
            </li>
            <li>
              <Link href="/#contact" className="hover:text-rose-600">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <section className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-orange-950 sm:text-3xl">
            Join Nexova&apos;s Talent Pool
          </h1>
          <p className="mb-4 text-orange-900">
            Fill out the form below to register your interest in job opportunities. Our team will
            review your profile and contact you if a suitable position arises.
          </p>
          <div className="mb-6 border-l-4 border-amber-500 bg-amber-100 p-4 text-amber-900" role="alert">
            Are you a company looking for talent? Write to us at{" "}
            <a href="mailto:contacto@nexova.com" className="text-rose-600 underline">
              contacto@nexova.com
            </a>
          </div>
        </section>

        <form
          className="space-y-6 rounded-lg border border-orange-200 bg-white/80 p-5 shadow backdrop-blur-sm sm:p-8"
          noValidate
          onSubmit={handleSubmit}
          onReset={handleReset}
        >
          <fieldset>
            <legend className="mb-4 text-xl font-semibold text-orange-900">Personal Information</legend>

            <div className="mb-4">
              <label htmlFor="fullName" className="mb-1 block font-medium">
                Full name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                value={values.fullName}
                onChange={(event) => setFieldValue("fullName", event.target.value)}
                onBlur={() => handleBlur("fullName")}
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-orange-950 placeholder:text-orange-400"
                placeholder="First and last name"
                required
              />
              {errors.fullName ? <p className="mt-1 text-sm text-red-600">{errors.fullName}</p> : null}
            </div>

            <div className="mb-4">
              <label htmlFor="email" className="mb-1 block font-medium">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={values.email}
                onChange={(event) => setFieldValue("email", event.target.value)}
                onBlur={() => handleBlur("email")}
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-orange-950 placeholder:text-orange-400"
                placeholder="name@company.com"
                required
              />
              {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email}</p> : null}
            </div>

            <div className="mb-4">
              <label htmlFor="phone" className="mb-1 block font-medium">
                Phone <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                value={values.phone}
                onChange={(event) => setFieldValue("phone", event.target.value)}
                onBlur={() => handleBlur("phone")}
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-orange-950 placeholder:text-orange-400"
                placeholder="+34 612 345 678"
                required
              />
              {errors.phone ? <p className="mt-1 text-sm text-red-600">{errors.phone}</p> : null}
            </div>

            <div className="mb-4">
              <label htmlFor="country" className="mb-1 block font-medium">
                Country of residence <span className="text-red-600">*</span>
              </label>
              <select
                id="country"
                value={values.country}
                onChange={(event) => {
                  const nextValues = { ...values, country: event.target.value };
                  setValues(nextValues);
                  validateAndSetField("country", nextValues);
                }}
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-orange-950"
                required
              >
                <option value="">Select country</option>
                <option value="Spain">Spain</option>
                <option value="United States">United States</option>
                <option value="Other">Other</option>
              </select>
              {errors.country ? <p className="mt-1 text-sm text-red-600">{errors.country}</p> : null}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-4 text-xl font-semibold text-orange-900">Professional Information</legend>

            <div className="mb-4">
              <label htmlFor="experience" className="mb-1 block font-medium">
                Years of experience <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="experience"
                min={0}
                max={50}
                value={values.experience}
                onChange={(event) => setFieldValue("experience", event.target.value)}
                onBlur={() => handleBlur("experience")}
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-orange-950 placeholder:text-orange-400"
                placeholder="e.g. 5"
                required
              />
              {errors.experience ? <p className="mt-1 text-sm text-red-600">{errors.experience}</p> : null}
            </div>

            <div className="mb-4">
              <label htmlFor="sector" className="mb-1 block font-medium">
                Sector of interest <span className="text-red-600">*</span>
              </label>
              <select
                id="sector"
                value={values.sector}
                onChange={(event) => {
                  const nextValues = { ...values, sector: event.target.value };
                  setValues(nextValues);
                  validateAndSetField("sector", nextValues);
                }}
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-orange-950"
                required
              >
                <option value="">Select sector</option>
                <option value="Technology">Technology</option>
                <option value="Retail">Retail</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Consulting">Consulting</option>
                <option value="Other">Other</option>
              </select>
              {errors.sector ? <p className="mt-1 text-sm text-red-600">{errors.sector}</p> : null}
            </div>

            <div className="mb-4">
              <label htmlFor="english" className="mb-1 block font-medium">
                English level <span className="text-red-600">*</span>
              </label>
              <select
                id="english"
                value={values.english}
                onChange={(event) => {
                  const nextValues = { ...values, english: event.target.value };
                  setValues(nextValues);
                  validateAndSetField("english", nextValues);
                }}
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-orange-950"
                required
              >
                <option value="">Select level</option>
                <option value="Basic">Basic</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Native">Native</option>
              </select>
              {errors.english ? <p className="mt-1 text-sm text-red-600">{errors.english}</p> : null}
            </div>

            <div className="mb-4">
              <span className="mb-1 block font-medium">
                Availability <span className="text-red-600">*</span>
              </span>
              <div className="flex flex-wrap gap-4">
                {[
                  "Immediate",
                  "1 month",
                  "2-3 months",
                  "Just exploring",
                ].map((option) => (
                  <label key={option} className="cursor-pointer">
                    <input
                      type="radio"
                      name="availability"
                      className="mr-2"
                      value={option}
                      checked={values.availability === option}
                      onChange={(event) => {
                        const nextValues = {
                          ...values,
                          availability: event.target.value,
                        };
                        setValues(nextValues);
                        validateAndSetField("availability", nextValues);
                      }}
                      required
                    />
                    {option}
                  </label>
                ))}
              </div>
              {errors.availability ? (
                <p className="mt-1 text-sm text-red-600">{errors.availability}</p>
              ) : null}
            </div>

            <div className="mb-4">
              <label htmlFor="linkedin" className="mb-1 block font-medium">
                LinkedIn (profile URL)
              </label>
              <input
                type="url"
                id="linkedin"
                value={values.linkedin}
                onChange={(event) => setFieldValue("linkedin", event.target.value)}
                onBlur={() => handleBlur("linkedin")}
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-orange-950 placeholder:text-orange-400"
                placeholder="https://linkedin.com/in/yourprofile"
              />
              {errors.linkedin ? <p className="mt-1 text-sm text-red-600">{errors.linkedin}</p> : null}
            </div>

            <div className="mb-4">
              <label htmlFor="comments" className="mb-1 block font-medium">
                Additional comments
              </label>
              <textarea
                id="comments"
                rows={3}
                maxLength={700}
                value={values.comments}
                onChange={(event) => {
                  const nextValues = { ...values, comments: event.target.value };
                  setValues(nextValues);
                  validateAndSetField("comments", nextValues);
                }}
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-orange-950 placeholder:text-orange-400"
                placeholder="Max 500 characters"
              />
              <div className="mt-1 flex justify-between text-sm text-orange-700">
                <span className={commentsRemaining < 0 ? "text-red-600" : ""}>
                  {commentsRemaining} characters remaining
                </span>
                {errors.comments ? <span className="text-red-600">{errors.comments}</span> : null}
              </div>
            </div>
          </fieldset>

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="policy"
              className="mr-2"
              checked={values.policy}
              onChange={(event) => {
                const nextValues = { ...values, policy: event.target.checked };
                setValues(nextValues);
                validateAndSetField("policy", nextValues);
              }}
              required
            />
            <label htmlFor="policy" className="font-medium">
              I accept the data policy <span className="text-red-600">*</span>
            </label>
          </div>
          {errors.policy ? <p className="mb-2 text-sm text-red-600">{errors.policy}</p> : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-rose-500 py-3 font-semibold text-white shadow transition hover:bg-rose-400"
            >
              Submit Application
            </button>
            <button
              type="reset"
              className="w-full rounded-lg border border-orange-300 bg-orange-100 py-3 font-semibold text-orange-900 transition hover:bg-orange-200"
            >
              Clear Form
            </button>
          </div>
        </form>
      </main>

      <footer className="mt-10 w-full border-t border-orange-300/40 bg-gradient-to-r from-rose-500 to-orange-500 py-6 text-orange-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between px-4 text-center sm:px-6 md:flex-row md:text-left">
          <span className="text-sm sm:text-base">© 2025 Nexova. All rights reserved.</span>
          <div className="mt-4 flex space-x-6 text-amber-100 md:mt-0">
            <a
              href="https://linkedin.com/company/nexova"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              LinkedIn
            </a>
            <a
              href="https://instagram.com/nexova"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>

      <div className={`fixed inset-0 z-50 ${isSuccessOpen ? "" : "hidden"}`} aria-hidden={!isSuccessOpen}>
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setIsSuccessOpen(false)}
          role="presentation"
        />
        <div className="relative z-10 flex min-h-full items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-modal-title"
            aria-describedby="success-modal-description"
            className="w-full max-w-lg rounded-xl border border-orange-200 bg-white p-6 shadow-2xl"
          >
            <h2 id="success-modal-title" className="text-2xl font-bold text-rose-600">
              Thank you for your interest in Nexova!
            </h2>
            <p id="success-modal-description" className="mt-3 text-orange-900">
              We have received your information. Our selection team will review it and contact you
              if your profile matches any of our current or future opportunities.
            </p>
            <p className="mt-3 text-orange-900">
              In the meantime, follow us on{" "}
              <a
                href="https://linkedin.com/company/nexova"
                className="font-semibold text-rose-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>{" "}
              to stay updated on our vacancies and professional development content.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSuccessOpen(false)}
                className="rounded-lg bg-rose-500 px-5 py-2.5 font-semibold text-white hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
