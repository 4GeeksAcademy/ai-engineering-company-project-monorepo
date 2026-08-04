"use client";

import { useState } from "react";
import Link from "next/link";

export default function ApplicationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    workEmail: "",
    phone: "",
    primaryOffice: "",
    companyName: "",
    industry: "",
    employeeCount: "",
    country: "",
    priorityArea: "",
    currentPain: "",
    targetDate: "",
    budgetRange: "",
    currentSlaHours: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-blue-950 antialiased flex flex-col justify-between">
      <header className="border-b border-blue-200 bg-white">
        <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8" aria-label="Navegacion principal">
          <Link href="/" className="text-lg font-semibold text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900">
            Nexova Solutions
          </Link>
          <section className="flex items-center gap-4 text-sm font-medium">
            <Link href="/backoffice" className="text-blue-900 hover:text-blue-700">Paneles</Link>
            <Link href="/backoffice" className="text-blue-900 hover:text-blue-700">Scoring IA</Link>
            <Link href="/" className="text-blue-900 hover:text-blue-700">Volver a inicio</Link>
          </section>
        </nav>
      </header>

      <main className="flex-1 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14 w-full">
        <article>
          <section className="mb-8">
            <h1 className="text-3xl font-bold text-blue-950 sm:text-4xl">Solicitud de diagnostico de transformacion digital</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-900 sm:text-base">
              Completa este formulario para evaluar oportunidades en seleccion, soporte al cliente, ventas o formacion corporativa. Nuestro equipo te contactara con una propuesta inicial.
            </p>
          </section>

          {submitted ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900 space-y-3">
              <h2 className="text-xl font-bold text-emerald-800">¡Solicitud recibida con éxito!</h2>
              <p className="text-sm">Gracias {formData.fullName}. Hemos registrado los datos de tu empresa ({formData.companyName}) y nos pondremos en contacto contigo en breve.</p>
              <Link href="/" className="inline-block mt-4 rounded-md bg-blue-900 px-4 py-2 text-xs font-semibold text-white">Volver al Inicio</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset className="space-y-4 rounded-xl border border-blue-300 bg-blue-100 p-5 sm:p-6">
                <legend className="px-2 text-base font-semibold text-blue-900">Datos de contacto</legend>

                <div className="grid gap-2">
                  <label htmlFor="fullName" className="text-sm font-medium text-blue-900">Nombre completo *</label>
                  <input
                    id="fullName"
                    required
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                    placeholder="Ej. Laura Mendoza"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="workEmail" className="text-sm font-medium text-blue-900">Email corporativo *</label>
                  <input
                    id="workEmail"
                    required
                    type="email"
                    value={formData.workEmail}
                    onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                    placeholder="nombre@empresa.com"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="phone" className="text-sm font-medium text-blue-900">Teléfono de contacto *</label>
                  <input
                    id="phone"
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                    placeholder="+34 600 123 456"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="primaryOffice" className="text-sm font-medium text-blue-900">Sede principal del proyecto *</label>
                  <select
                    id="primaryOffice"
                    required
                    value={formData.primaryOffice}
                    onChange={(e) => setFormData({ ...formData, primaryOffice: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                  >
                    <option value="">Selecciona una sede</option>
                    <option value="valencia">Valencia (ES)</option>
                    <option value="miami">Miami (US)</option>
                    <option value="otra">Otra</option>
                  </select>
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-blue-300 bg-blue-100 p-5 sm:p-6">
                <legend className="px-2 text-base font-semibold text-blue-900">Datos de la empresa</legend>

                <div className="grid gap-2">
                  <label htmlFor="companyName" className="text-sm font-medium text-blue-900">Empresa *</label>
                  <input
                    id="companyName"
                    required
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                    placeholder="Nombre legal de la empresa"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="industry" className="text-sm font-medium text-blue-900">Sector principal *</label>
                  <select
                    id="industry"
                    required
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                  >
                    <option value="">Selecciona un sector</option>
                    <option value="tecnologia">Tecnología</option>
                    <option value="retail">Retail</option>
                    <option value="servicios-financieros">Servicios financieros</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="employeeCount" className="text-sm font-medium text-blue-900">Número de empleados *</label>
                  <input
                    id="employeeCount"
                    required
                    type="number"
                    min="10"
                    max="10000"
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                    placeholder="Ej. 120"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="country" className="text-sm font-medium text-blue-900">País de operación principal *</label>
                  <input
                    id="country"
                    required
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                    placeholder="Ej. España"
                  />
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-xl border border-blue-300 bg-blue-100 p-5 sm:p-6">
                <legend className="px-2 text-base font-semibold text-blue-900">Objetivo del proyecto</legend>

                <div className="grid gap-2">
                  <label htmlFor="priorityArea" className="text-sm font-medium text-blue-900">Área que necesita atención inmediata *</label>
                  <select
                    id="priorityArea"
                    required
                    value={formData.priorityArea}
                    onChange={(e) => setFormData({ ...formData, priorityArea: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="operaciones-seleccion">Operaciones de selección</option>
                    <option value="soporte-cliente">Atención al cliente externalizado</option>
                    <option value="ventas">Ventas y desarrollo de negocio</option>
                    <option value="formacion">Formación corporativa</option>
                    <option value="rrhh">RRHH interno</option>
                    <option value="direccion">Dirección ejecutiva</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="currentPain" className="text-sm font-medium text-blue-900">Problema principal actual *</label>
                  <textarea
                    id="currentPain"
                    required
                    minLength={20}
                    maxLength={500}
                    rows={4}
                    value={formData.currentPain}
                    onChange={(e) => setFormData({ ...formData, currentPain: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                    placeholder="Describe el cuello de botella: tareas manuales, incumplimiento de SLA, falta de visibilidad, etc."
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="targetDate" className="text-sm font-medium text-blue-900">Fecha objetivo para iniciar *</label>
                  <input
                    id="targetDate"
                    required
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="budgetRange" className="text-sm font-medium text-blue-900">Rango estimado de inversión anual (USD) *</label>
                  <select
                    id="budgetRange"
                    required
                    value={formData.budgetRange}
                    onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                  >
                    <option value="">Selecciona un rango</option>
                    <option value="menos-50000">Menos de 50.000</option>
                    <option value="50000-150000">50.000 - 150.000</option>
                    <option value="150001-300000">150.001 - 300.000</option>
                    <option value="mas-300000">Más de 300.000</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="currentSlaHours" className="text-sm font-medium text-blue-900">SLA actual de soporte (horas) *</label>
                  <input
                    id="currentSlaHours"
                    required
                    type="number"
                    min="24"
                    max="168"
                    value={formData.currentSlaHours}
                    onChange={(e) => setFormData({ ...formData, currentSlaHours: e.target.value })}
                    className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-700/30"
                    placeholder="Ej. 48"
                  />
                </div>
              </fieldset>

              <div className="flex gap-3">
                <button type="submit" className="rounded-md bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800">
                  Enviar solicitud
                </button>
              </div>
            </form>
          )}
        </article>
      </main>

      <footer className="border-t border-blue-800 bg-blue-900 text-white">
        <section className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-6 text-sm text-white sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="text-blue-100">Nexova Solutions</p>
          <p className="text-blue-100">Valencia (ES) · Miami (US)</p>
          <p className="text-blue-100">contacto@nexova.example.com</p>
        </section>
      </footer>
    </div>
  );
}
