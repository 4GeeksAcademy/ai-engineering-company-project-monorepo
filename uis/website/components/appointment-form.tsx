"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { clinics } from "@/lib/clinics";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import {
  EMPTY_ENQUIRY,
  MAX_CONCERN_LENGTH,
  getDateLimits,
  parseDateInput,
  startOfToday,
  toDateInputValue,
  validateEnquiry,
  type EnquiryErrors,
  type EnquiryField,
  type EnquiryValues,
  type YesNo,
} from "@/lib/validation";

const LANGUAGE_OPTIONS: { value: string; key: TranslationKey }[] = [
  { value: "English", key: "options.english" },
  { value: "Spanish", key: "options.spanish" },
];

const TIME_OPTIONS: { value: string; key: TranslationKey }[] = [
  { value: "morning", key: "options.morning" },
  { value: "afternoon", key: "options.afternoon" },
  { value: "evening", key: "options.evening" },
];

const SERVICE_OPTIONS: { value: string; key: TranslationKey }[] = [
  { value: "primary_care", key: "options.primary" },
  { value: "chronic_disease", key: "options.chronic" },
  { value: "specialist", key: "options.specialist" },
  { value: "preventive", key: "options.preventive" },
  { value: "womens_health", key: "options.womens" },
  { value: "paediatric", key: "options.paediatric" },
  { value: "mental_health", key: "options.mental" },
];

const subscribeToNothing = () => () => {};
const getTodayValue = () => toDateInputValue(startOfToday());
const getServerTodayValue = () => "";

export function AppointmentForm() {
  const { t } = useLanguage();
  const [values, setValues] = useState<EnquiryValues>(EMPTY_ENQUIRY);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Date limits depend on the visitor's local date, so they are only set in the browser.
  const todayValue = useSyncExternalStore(subscribeToNothing, getTodayValue, getServerTodayValue);
  const limits = useMemo(() => (todayValue ? getDateLimits(parseDateInput(todayValue)) : null), [todayValue]);

  const update = <K extends EnquiryField>(field: K, value: EnquiryValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const errorText = (field: EnquiryField) => {
    const error = errors[field];
    if (!error) return "";
    return error.remaining === undefined ? t(error.key) : t(error.key).replace("X", String(error.remaining));
  };

  const fieldProps = (field: EnquiryField) => ({
    id: field,
    name: field,
    className: errors[field] ? "invalid" : undefined,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": `${field}-error`,
  });

  const errorSlot = (field: EnquiryField) => (
    <span className="field-error" id={`${field}-error`}>
      {errorText(field)}
    </span>
  );

  const eveningWarningKey =
    values.preferred_time === "evening"
      ? clinics.find((clinic) => clinic.name === values.preferred_clinic)?.eveningWarningKey
      : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateEnquiry(values, startOfToday());
    flushSync(() => setErrors(nextErrors));

    if (Object.keys(nextErrors).length > 0) {
      formRef.current
        ?.querySelector(".invalid, .field-error:not(:empty)")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Submission is simulated locally; no enquiry data leaves the browser.
    flushSync(() => setSubmitted(true));
    successRef.current?.focus();
  };

  const yesNoGroup = (field: "new_patient" | "has_insurance", legendKey: TranslationKey) => (
    <fieldset aria-describedby={`${field}-error`}>
      <legend>{t(legendKey)}</legend>
      <div className="choice-row">
        {(["yes", "no"] as YesNo[]).map((option) => (
          <label key={option}>
            <input
              type="radio"
              name={field}
              value={option}
              checked={values[field] === option}
              onChange={() => update(field, option)}
            />{" "}
            <span>{t(option === "yes" ? "options.yes" : "options.no")}</span>
          </label>
        ))}
      </div>
      {errorSlot(field)}
    </fieldset>
  );

  return (
    <form id="appointment-form" ref={formRef} noValidate onSubmit={handleSubmit}>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="first_name">{t("fields.first_name")}</label>
          <input
            {...fieldProps("first_name")}
            type="text"
            autoComplete="given-name"
            maxLength={50}
            value={values.first_name}
            onChange={(event) => update("first_name", event.target.value)}
          />
          {errorSlot("first_name")}
        </div>
        <div className="field">
          <label htmlFor="last_name">{t("fields.last_name")}</label>
          <input
            {...fieldProps("last_name")}
            type="text"
            autoComplete="family-name"
            maxLength={50}
            value={values.last_name}
            onChange={(event) => update("last_name", event.target.value)}
          />
          {errorSlot("last_name")}
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="date_of_birth">{t("fields.date_of_birth")}</label>
          <input
            {...fieldProps("date_of_birth")}
            type="date"
            min={limits?.dobMin}
            max={limits?.dobMax}
            value={values.date_of_birth}
            onChange={(event) => update("date_of_birth", event.target.value)}
          />
          {errorSlot("date_of_birth")}
        </div>
        <div className="field">
          <label htmlFor="email">{t("fields.email")}</label>
          <input
            {...fieldProps("email")}
            type="email"
            autoComplete="email"
            placeholder="name@provider.com"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
          />
          {errorSlot("email")}
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="phone">{t("fields.phone")}</label>
          <input
            {...fieldProps("phone")}
            type="tel"
            autoComplete="tel"
            placeholder="+1 305 555 0191"
            value={values.phone}
            onChange={(event) => update("phone", event.target.value)}
          />
          {errorSlot("phone")}
        </div>
        <div className="field">
          <label htmlFor="preferred_language">{t("fields.language")}</label>
          <select
            {...fieldProps("preferred_language")}
            value={values.preferred_language}
            onChange={(event) => update("preferred_language", event.target.value)}
          >
            <option value="">{t("options.choose")}</option>
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.key)}
              </option>
            ))}
          </select>
          {errorSlot("preferred_language")}
        </div>
      </div>

      <div className="field">
        <label htmlFor="preferred_clinic">{t("fields.clinic")}</label>
        <select
          {...fieldProps("preferred_clinic")}
          value={values.preferred_clinic}
          onChange={(event) => update("preferred_clinic", event.target.value)}
        >
          <option value="">{t("options.choose")}</option>
          {clinics.map((clinic) => (
            <option key={clinic.name} value={clinic.name}>
              {clinic.name}
            </option>
          ))}
        </select>
        {errorSlot("preferred_clinic")}
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="preferred_date">{t("fields.date")}</label>
          <input
            {...fieldProps("preferred_date")}
            type="date"
            min={limits?.appointmentMin}
            max={limits?.appointmentMax}
            value={values.preferred_date}
            onChange={(event) => update("preferred_date", event.target.value)}
          />
          {errorSlot("preferred_date")}
        </div>
        <div className="field">
          <label htmlFor="preferred_time">{t("fields.time")}</label>
          <select
            {...fieldProps("preferred_time")}
            value={values.preferred_time}
            onChange={(event) => update("preferred_time", event.target.value)}
          >
            <option value="">{t("options.choose")}</option>
            {TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.key)}
              </option>
            ))}
          </select>
          {errorSlot("preferred_time")}
          <span className="field-warning" id="time-warning" aria-live="polite">
            {eveningWarningKey ? t(eveningWarningKey) : ""}
          </span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="service_type">{t("fields.service")}</label>
        <select
          {...fieldProps("service_type")}
          value={values.service_type}
          onChange={(event) => update("service_type", event.target.value)}
        >
          <option value="">{t("options.choose")}</option>
          {SERVICE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.key)}
            </option>
          ))}
        </select>
        {errorSlot("service_type")}
      </div>

      {yesNoGroup("new_patient", "fields.new_patient")}

      <div className={`field conditional${values.new_patient === "no" ? " visible" : ""}`} id="patient-id-field">
        <label htmlFor="patient_id">{t("fields.patient_id")}</label>
        <input
          {...fieldProps("patient_id")}
          type="text"
          placeholder="HC-A3F291"
          value={values.patient_id}
          onChange={(event) => update("patient_id", event.target.value)}
        />
        {errorSlot("patient_id")}
      </div>

      {yesNoGroup("has_insurance", "fields.insurance")}

      <div className={`field-grid conditional${values.has_insurance === "yes" ? " visible" : ""}`} id="insurance-fields">
        <div className="field">
          <label htmlFor="insurance_provider">{t("fields.provider")}</label>
          <input
            {...fieldProps("insurance_provider")}
            type="text"
            maxLength={100}
            value={values.insurance_provider}
            onChange={(event) => update("insurance_provider", event.target.value)}
          />
          {errorSlot("insurance_provider")}
        </div>
        <div className="field">
          <label htmlFor="insurance_member_id">{t("fields.member_id")}</label>
          <input
            {...fieldProps("insurance_member_id")}
            type="text"
            value={values.insurance_member_id}
            onChange={(event) => update("insurance_member_id", event.target.value)}
          />
          {errorSlot("insurance_member_id")}
        </div>
      </div>

      <div className="field">
        <label htmlFor="health_concern">{t("fields.concern")}</label>
        <textarea
          {...fieldProps("health_concern")}
          rows={5}
          maxLength={MAX_CONCERN_LENGTH}
          value={values.health_concern}
          onChange={(event) => update("health_concern", event.target.value)}
        />
        <div className="counter">
          <span>{t("form.counter")}</span>
          <output id="concern-counter">
            {values.health_concern.trim().length} / {MAX_CONCERN_LENGTH}
          </output>
        </div>
        {errorSlot("health_concern")}
      </div>

      <label className="consent">
        <input
          id="contact_consent"
          name="contact_consent"
          type="checkbox"
          aria-describedby="contact_consent-error"
          checked={values.contact_consent}
          onChange={(event) => update("contact_consent", event.target.checked)}
        />
        <span>{t("fields.consent")}</span>
      </label>
      {errorSlot("contact_consent")}

      <p className="partner-note">{t("form.partner")}</p>

      <button className="button button-submit" type="submit" disabled={submitted}>
        {t("form.submit")} <span aria-hidden="true">↗</span>
      </button>

      <div className="success-message" id="success-message" role="status" tabIndex={-1} ref={successRef} hidden={!submitted}>
        <strong>{t("success.title")}</strong>
        <p>{t("success.text")}</p>
        <p>{t("success.urgent")}</p>
        <p>{t("success.close")}</p>
      </div>
    </form>
  );
}
