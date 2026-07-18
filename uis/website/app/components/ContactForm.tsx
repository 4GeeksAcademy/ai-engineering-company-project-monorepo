"use client";

import { FormEvent, useMemo, useState } from "react";

type CountryOperation = "" | "Estados Unidos" | "España" | "Ambos" | "Otro";
type ProductType = "" | "Moda" | "Electrónica" | "Cosmética" | "Alimentación" | "Otro";
type MonthlyVolume = "" | "0-100" | "101-500" | "501-2000" | "2000+" | "No estoy seguro";
type ServiceOption = "Almacenaje" | "Última milla" | "Logística inversa";
type Other3plOption = "" | "Sí" | "No" | "Estoy evaluando opciones";

type FormState = {
  companyName: string;
  contactPerson: string;
  corporateEmail: string;
  phone: string;
  website: string;
  countryOperation: CountryOperation;
  productType: ProductType;
  monthlyVolume: MonthlyVolume;
  services: ServiceOption[];
  other3pl: Other3plOption;
  comments: string;
  privacyPolicy: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  companyName: "",
  contactPerson: "",
  corporateEmail: "",
  phone: "",
  website: "",
  countryOperation: "",
  productType: "",
  monthlyVolume: "",
  services: [],
  other3pl: "",
  comments: "",
  privacyPolicy: false,
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string>("");

  const remainingComments = 500 - form.comments.length;
  const showLowVolumeWarning = form.monthlyVolume === "0-100" && form.productType !== "";

  const warningMessage =
    "Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?";

  const servicesOptions: ServiceOption[] = ["Almacenaje", "Última milla", "Logística inversa"];

  const validateForm = useMemo(
    () => (data: FormState): FormErrors => {
      const nextErrors: FormErrors = {};

      if (data.companyName.trim().length < 2) {
        nextErrors.companyName = "El nombre de la empresa debe tener al menos 2 caracteres";
      }

      if (data.contactPerson.trim().split(/\s+/).filter(Boolean).length < 2) {
        nextErrors.contactPerson = "Ingresa nombre y apellido del contacto";
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.corporateEmail.trim())) {
        nextErrors.corporateEmail = "Ingresa un email corporativo válido (ejemplo: nombre@empresa.com)";
      }

      const phoneRegex = /^\+\d{1,3}\s.+/;
      if (!phoneRegex.test(data.phone.trim())) {
        nextErrors.phone = "El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)";
      }

      if (data.website.trim().length > 0) {
        const websiteRegex = /^https?:\/\/\S+$/i;
        const isValidWebsite = websiteRegex.test(data.website.trim());

        if (!isValidWebsite) {
          nextErrors.website = "Si incluyes sitio web, debe ser una URL válida";
        }
      }

      if (!data.countryOperation) {
        nextErrors.countryOperation = "Selecciona el país de operación principal";
      }

      if (!data.productType) {
        nextErrors.productType = "Selecciona el tipo de producto que manejas";
      }

      if (!data.monthlyVolume) {
        nextErrors.monthlyVolume = "Selecciona el volumen mensual estimado";
      }

      if (data.services.length < 1) {
        nextErrors.services = "Selecciona al menos un servicio de interés";
      }

      if (!data.other3pl) {
        nextErrors.other3pl = "Indica si actualmente trabajas con otro proveedor logístico";
      }

      if (data.comments.length > 500) {
        nextErrors.comments = `Los comentarios no pueden exceder 500 caracteres (quedan ${500 - data.comments.length})`;
      }

      if (!data.privacyPolicy) {
        nextErrors.privacyPolicy = "Debes aceptar la política de privacidad para continuar";
      }

      return nextErrors;
    },
    [],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSuccessMessage("");
      return;
    }

    setSuccessMessage(
      "¡Gracias por tu interés en TrackFlow! Hemos recibido tu solicitud. Nuestro equipo comercial revisará tu información y te contactará en las próximas 24-48 horas para agendar una llamada y conocer tus necesidades logísticas en detalle. Si tienes alguna consulta urgente, escríbenos directamente a comercial@trackflow.com",
    );

    setForm(initialState);
    setErrors({});
  };

  const handleReset = () => {
    setForm(initialState);
    setErrors({});
    setSuccessMessage("");
  };

  const toggleService = (service: ServiceOption) => {
    setForm((previous) => {
      const alreadySelected = previous.services.includes(service);
      const services = alreadySelected
        ? previous.services.filter((current) => current !== service)
        : [...previous.services, service];

      return { ...previous, services };
    });
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Solicitar información</h2>
        <p className="mt-3 max-w-3xl text-slate-300">
          Completa este formulario para que el equipo comercial de TrackFlow evalúe tu operación y te contacte con una propuesta.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-8">
        {successMessage ? (
          <div
            className="mb-6 rounded-lg border border-emerald-500/40 bg-emerald-400/10 p-4 text-sm text-emerald-200"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold">¡Gracias por tu interés en TrackFlow!</p>
            <p className="mt-2">
              Hemos recibido tu solicitud. Nuestro equipo comercial revisará tu información y te contactará en las
              próximas 24-48 horas para agendar una llamada y conocer tus necesidades logísticas en detalle.
            </p>
            <p className="mt-2">
              Si tienes alguna consulta urgente, escríbenos directamente a
              <a href="mailto:comercial@trackflow.com" className="ml-1 text-emerald-100 underline underline-offset-2">
                comercial@trackflow.com
              </a>
            </p>
          </div>
        ) : null}

        {showLowVolumeWarning ? (
          <div
            className="mb-6 rounded-lg border border-amber-500/40 bg-amber-400/10 p-4 text-sm text-amber-200"
            role="alert"
            aria-live="polite"
          >
            {warningMessage}
          </div>
        ) : null}

        <form className="space-y-8" noValidate onSubmit={handleSubmit} onReset={handleReset}>
          <fieldset className="space-y-4 rounded-xl border border-slate-800 p-4 sm:p-5">
            <legend className="px-2 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Información de Empresa
            </legend>

            <div>
              <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-slate-200">
                Nombre de la empresa *
              </label>
              <input
                id="companyName"
                type="text"
                value={form.companyName}
                onChange={(event) => setForm({ ...form, companyName: event.target.value })}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                aria-describedby="companyName-error"
                aria-invalid={Boolean(errors.companyName)}
              />
              <p id="companyName-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.companyName}
              </p>
            </div>

            <div>
              <label htmlFor="contactPerson" className="mb-1 block text-sm font-medium text-slate-200">
                Persona de contacto *
              </label>
              <input
                id="contactPerson"
                type="text"
                value={form.contactPerson}
                onChange={(event) => setForm({ ...form, contactPerson: event.target.value })}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                aria-describedby="contactPerson-error"
                aria-invalid={Boolean(errors.contactPerson)}
              />
              <p id="contactPerson-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.contactPerson}
              </p>
            </div>

            <div>
              <label htmlFor="corporateEmail" className="mb-1 block text-sm font-medium text-slate-200">
                Email corporativo *
              </label>
              <input
                id="corporateEmail"
                type="email"
                value={form.corporateEmail}
                onChange={(event) => setForm({ ...form, corporateEmail: event.target.value })}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                aria-describedby="corporateEmail-error"
                aria-invalid={Boolean(errors.corporateEmail)}
              />
              <p id="corporateEmail-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.corporateEmail}
              </p>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-200">
                Teléfono *
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                aria-describedby="phone-error"
                aria-invalid={Boolean(errors.phone)}
              />
              <p id="phone-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.phone}
              </p>
            </div>

            <div>
              <label htmlFor="website" className="mb-1 block text-sm font-medium text-slate-200">
                Sitio web de la empresa
              </label>
              <input
                id="website"
                type="url"
                value={form.website}
                onChange={(event) => setForm({ ...form, website: event.target.value })}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                aria-describedby="website-error"
                aria-invalid={Boolean(errors.website)}
              />
              <p id="website-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.website}
              </p>
            </div>

            <div>
              <label htmlFor="countryOperation" className="mb-1 block text-sm font-medium text-slate-200">
                País de operación principal *
              </label>
              <select
                id="countryOperation"
                value={form.countryOperation}
                onChange={(event) =>
                  setForm({ ...form, countryOperation: event.target.value as CountryOperation })
                }
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                aria-describedby="countryOperation-error"
                aria-invalid={Boolean(errors.countryOperation)}
              >
                <option value="">Selecciona una opción</option>
                <option value="Estados Unidos">Estados Unidos</option>
                <option value="España">España</option>
                <option value="Ambos">Ambos</option>
                <option value="Otro">Otro</option>
              </select>
              <p id="countryOperation-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.countryOperation}
              </p>
            </div>

            <div>
              <label htmlFor="productType" className="mb-1 block text-sm font-medium text-slate-200">
                Tipo de producto *
              </label>
              <select
                id="productType"
                value={form.productType}
                onChange={(event) => setForm({ ...form, productType: event.target.value as ProductType })}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                aria-describedby="productType-error"
                aria-invalid={Boolean(errors.productType)}
              >
                <option value="">Selecciona una opción</option>
                <option value="Moda">Moda</option>
                <option value="Electrónica">Electrónica</option>
                <option value="Cosmética">Cosmética</option>
                <option value="Alimentación">Alimentación</option>
                <option value="Otro">Otro</option>
              </select>
              <p id="productType-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.productType}
              </p>
            </div>

            <div>
              <label htmlFor="monthlyVolume" className="mb-1 block text-sm font-medium text-slate-200">
                Volumen mensual estimado de envíos *
              </label>
              <select
                id="monthlyVolume"
                value={form.monthlyVolume}
                onChange={(event) => setForm({ ...form, monthlyVolume: event.target.value as MonthlyVolume })}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                aria-describedby="monthlyVolume-error"
                aria-invalid={Boolean(errors.monthlyVolume)}
              >
                <option value="">Selecciona una opción</option>
                <option value="0-100">0-100</option>
                <option value="101-500">101-500</option>
                <option value="501-2000">501-2000</option>
                <option value="2000+">2000+</option>
                <option value="No estoy seguro">No estoy seguro</option>
              </select>
              <p id="monthlyVolume-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.monthlyVolume}
              </p>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-slate-800 p-4 sm:p-5">
            <legend className="px-2 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Servicios de interés
            </legend>

            <div role="group" aria-labelledby="services-label" aria-describedby="services-error">
              <p id="services-label" className="mb-2 text-sm font-medium text-slate-200">
                Selecciona al menos un servicio *
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                {servicesOptions.map((service) => (
                  <label
                    key={service}
                    className="flex h-full items-start gap-3 rounded-md border border-slate-700 bg-slate-950 p-3"
                  >
                    <input
                      name="services"
                      type="checkbox"
                      checked={form.services.includes(service)}
                      onChange={() => toggleService(service)}
                      className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-200">{service}</span>
                  </label>
                ))}
              </div>
              <p id="services-error" className="mt-2 text-sm text-red-300" aria-live="polite">
                {errors.services}
              </p>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-slate-800 p-4 sm:p-5">
            <legend className="px-2 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Relación actual con 3PL
            </legend>

            <div role="radiogroup" aria-labelledby="other3pl-label" aria-describedby="other3pl-error" className="space-y-2">
              <p id="other3pl-label" className="text-sm font-medium text-slate-200">
                ¿Actualmente trabajas con otro 3PL? *
              </p>

              {(["Sí", "No", "Estoy evaluando opciones"] as Other3plOption[])
                .filter((option) => option)
                .map((option) => (
                  <label key={option} className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-950 p-3">
                    <input
                      type="radio"
                      name="other3pl"
                      value={option}
                      checked={form.other3pl === option}
                      onChange={(event) => setForm({ ...form, other3pl: event.target.value as Other3plOption })}
                      className="h-4 w-4 border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-200">{option}</span>
                  </label>
                ))}

              <p id="other3pl-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.other3pl}
              </p>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-slate-800 p-4 sm:p-5">
            <legend className="px-2 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Comentarios y privacidad
            </legend>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label htmlFor="comments" className="block text-sm font-medium text-slate-200">
                  Comentarios o necesidades específicas
                </label>
                <span id="comments-counter" className="text-xs text-slate-400">
                  {form.comments.length}/500
                </span>
              </div>
              <textarea
                id="comments"
                rows={4}
                value={form.comments}
                onChange={(event) => setForm({ ...form, comments: event.target.value })}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                aria-describedby="comments-error comments-counter"
                aria-invalid={Boolean(errors.comments)}
              ></textarea>
              <p id="comments-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.comments || (remainingComments < 0 ? `Los comentarios no pueden exceder 500 caracteres (quedan ${remainingComments})` : "")}
              </p>
            </div>

            <div>
              <label className="flex items-start gap-3 rounded-md border border-slate-700 bg-slate-950 p-3">
                <input
                  id="privacyPolicy"
                  type="checkbox"
                  checked={form.privacyPolicy}
                  onChange={(event) => setForm({ ...form, privacyPolicy: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-200">Acepto política de privacidad *</span>
              </label>
              <p id="privacyPolicy-error" className="mt-1 text-sm text-red-300" aria-live="polite">
                {errors.privacyPolicy}
              </p>
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              Enviar solicitud
            </button>
            <button
              type="reset"
              className="rounded-md border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
