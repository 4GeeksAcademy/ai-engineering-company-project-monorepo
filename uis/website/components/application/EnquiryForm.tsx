"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { clinics } from "@/lib/content";
import { useLanguage } from "@/components/LanguageProvider";
import {
  emptyFormValues,
  validateEnquiryForm,
  type EnquiryFormValues,
  type FormErrors,
} from "@/lib/validation";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-600";

export function EnquiryForm() {
  const { t } = useLanguage();
  const [values, setValues] = useState<EnquiryFormValues>(emptyFormValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [warning, setWarning] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const f = t.form;
  const remaining = Math.max(0, 20 - values.health_concern.trim().length);

  function updateField<K extends keyof EnquiryFormValues>(key: K, value: EnquiryFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateEnquiryForm(values, t.errors);
    setErrors(result.fieldErrors);
    setWarning(result.warning);
    if (result.valid) setSubmitted(true);
  }

  function handleClear() {
    setValues(emptyFormValues);
    setErrors({});
    setWarning(undefined);
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-6 text-slate-800" role="status">
        <h2 className="text-xl font-semibold text-teal-900">{f.successTitle}</h2>
        <p className="mt-3">{f.successBody}</p>
        <p className="mt-3">{f.successUrgent}</p>
        <p className="mt-3 font-medium">{f.successClosing}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <fieldset>
        <legend className="text-xl font-semibold text-teal-700">{f.personalDetails}</legend>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={f.firstName} error={errors.first_name}>
            <input
              id="first_name"
              name="first_name"
              value={values.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label={f.lastName} error={errors.last_name}>
            <input
              id="last_name"
              name="last_name"
              value={values.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label={f.dob} error={errors.date_of_birth}>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={values.date_of_birth}
              onChange={(e) => updateField("date_of_birth", e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label={f.email} error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={f.phone} error={errors.phone}>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={values.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={inputClass}
                placeholder="+1 305 555 0191"
                required
              />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-xl font-semibold text-teal-700">{f.enquiryDetails}</legend>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={f.preferredLanguage} error={errors.preferred_language}>
            <select
              id="preferred_language"
              name="preferred_language"
              value={values.preferred_language}
              onChange={(e) => updateField("preferred_language", e.target.value)}
              className={`${inputClass} bg-white`}
              required
            >
              <option value="">{f.selectOne}</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
            </select>
          </Field>
          <Field label={f.preferredClinic} error={errors.preferred_clinic}>
            <select
              id="preferred_clinic"
              name="preferred_clinic"
              value={values.preferred_clinic}
              onChange={(e) => updateField("preferred_clinic", e.target.value)}
              className={`${inputClass} bg-white`}
              required
            >
              <option value="">{f.selectOne}</option>
              {clinics.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={f.preferredDate} error={errors.preferred_date}>
            <input
              id="preferred_date"
              name="preferred_date"
              type="date"
              value={values.preferred_date}
              onChange={(e) => updateField("preferred_date", e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label={f.preferredTime} error={errors.preferred_time}>
            <select
              id="preferred_time"
              name="preferred_time"
              value={values.preferred_time}
              onChange={(e) => updateField("preferred_time", e.target.value)}
              className={`${inputClass} bg-white`}
              required
            >
              <option value="">{f.selectOne}</option>
              <option value="Morning (7am–12pm)">{f.morning}</option>
              <option value="Afternoon (12pm–5pm)">{f.afternoon}</option>
              <option value="Evening (5pm–8pm)">{f.evening}</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={f.serviceType} error={errors.service_type ?? errors.paediatric}>
              <select
                id="service_type"
                name="service_type"
                value={values.service_type}
                onChange={(e) => updateField("service_type", e.target.value)}
                className={`${inputClass} bg-white`}
                required
              >
                <option value="">{f.selectOne}</option>
                <option value="Primary Care">{f.services.primary}</option>
                <option value="Chronic Disease Management">{f.services.chronic}</option>
                <option value="Specialist Consultation">{f.services.specialist}</option>
                <option value="Preventive Health">{f.services.preventive}</option>
                <option value="Women's Health">{f.services.womens}</option>
                <option value="Paediatric Care">{f.services.paediatric}</option>
                <option value="Mental Health">{f.services.mental}</option>
              </select>
            </Field>
          </div>
          <RadioGroup
            label={f.newPatient}
            name="new_patient"
            value={values.new_patient}
            onChange={(v) => updateField("new_patient", v)}
            error={errors.new_patient}
            yesLabel={f.yes}
            noLabel={f.no}
          />
        </div>
        {values.new_patient === "No" ? (
          <div className="mt-4">
            <Field label={f.patientId} error={errors.patient_id}>
              <input
                id="patient_id"
                name="patient_id"
                value={values.patient_id}
                onChange={(e) => updateField("patient_id", e.target.value)}
                className={inputClass}
                placeholder="HC-A3F291"
              />
            </Field>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-xl font-semibold text-teal-700">{f.insurance}</legend>
        <RadioGroup
          label={f.hasInsurance}
          name="has_insurance"
          value={values.has_insurance}
          onChange={(v) => updateField("has_insurance", v)}
          error={errors.has_insurance}
          yesLabel={f.yes}
          noLabel={f.no}
        />
        {values.has_insurance === "Yes" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={f.insuranceProvider} error={errors.insurance_provider}>
              <input
                id="insurance_provider"
                name="insurance_provider"
                value={values.insurance_provider}
                onChange={(e) => updateField("insurance_provider", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={f.memberId} error={errors.insurance_member_id}>
              <input
                id="insurance_member_id"
                name="insurance_member_id"
                value={values.insurance_member_id}
                onChange={(e) => updateField("insurance_member_id", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="mt-8">
        <legend className="text-xl font-semibold text-teal-700">{f.healthConcern}</legend>
        <Field label={f.healthConcernLabel} error={errors.health_concern}>
          <textarea
            id="health_concern"
            name="health_concern"
            rows={4}
            value={values.health_concern}
            onChange={(e) => updateField("health_concern", e.target.value)}
            className={inputClass}
            required
          />
          <p className="mt-1 text-sm text-slate-500">{f.charsRemaining(remaining)}</p>
        </Field>
      </fieldset>

      <div className="mt-6">
        <label className="flex items-start gap-2">
          <input
            id="contact_consent"
            name="contact_consent"
            type="checkbox"
            checked={values.contact_consent}
            onChange={(e) => updateField("contact_consent", e.target.checked)}
            className="mt-1"
            required
          />
          <span>{f.consent}</span>
        </label>
        {errors.contact_consent ? (
          <p className="mt-1 text-sm text-red-700" role="alert">
            {errors.contact_consent}
          </p>
        ) : null}
      </div>

      {warning ? (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          {warning}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="submit" className="rounded-lg bg-teal-700 px-6 py-2 font-semibold text-white hover:bg-teal-800">
          {f.submit}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg border border-slate-300 px-6 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          {f.clear}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block font-medium">{label}</label>
      {children}
      {error ? (
        <p className="mt-1 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RadioGroup({
  label,
  name,
  value,
  onChange,
  error,
  yesLabel,
  noLabel,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="sm:col-span-2">
      <p className="font-medium">{label}</p>
      <div className="mt-2 flex gap-6">
        {["Yes", "No"].map((option) => (
          <label key={option} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{option === "Yes" ? yesLabel : noLabel}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p className="mt-1 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
