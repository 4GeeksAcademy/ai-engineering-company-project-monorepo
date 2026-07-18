"use client";

import { useMemo, useState } from "react";
import type {
  PaisOperacion,
  ServicioInteres,
  TipoProducto,
  TrabajaCon3PL,
  VolumenMensual,
} from "../../../../src/types/models";
import { obtenerAdvertenciaVolumenBajo, validarLead } from "../../../../src/utils/validations";

type FormState = {
  nombreEmpresa: string;
  personaContacto: string;
  emailCorporativo: string;
  telefono: string;
  sitioWeb: string;
  paisOperacion: PaisOperacion;
  tipoProducto: TipoProducto;
  volumenMensual: VolumenMensual;
  serviciosInteres: ServicioInteres[];
  trabajaCon3PL: TrabajaCon3PL;
  comentarios: string;
  aceptaPrivacidad: boolean;
};

type ValidationResultState = {
  valido: boolean;
  errores: Record<string, string>;
} | null;

const servicioOptions: ServicioInteres[] = ["Almacenaje", "Última milla", "Logística inversa"];

const initialState: FormState = {
  nombreEmpresa: "",
  personaContacto: "",
  emailCorporativo: "",
  telefono: "",
  sitioWeb: "",
  paisOperacion: "Estados Unidos",
  tipoProducto: "Moda",
  volumenMensual: "101-500",
  serviciosInteres: ["Almacenaje"],
  trabajaCon3PL: "No",
  comentarios: "",
  aceptaPrivacidad: false,
};

export function LeadValidationPanel() {
  const [form, setForm] = useState<FormState>(initialState);
  const [result, setResult] = useState<ValidationResultState>(null);

  const warning = useMemo(() => obtenerAdvertenciaVolumenBajo(form), [form]);

  const handleServiceToggle = (service: ServicioInteres) => {
    setForm((prev) => {
      const exists = prev.serviciosInteres.includes(service);
      const serviciosInteres = exists
        ? prev.serviciosInteres.filter((current) => current !== service)
        : [...prev.serviciosInteres, service];

      return { ...prev, serviciosInteres };
    });
  };

  const handleExecute = () => {
    const validation = validarLead(form);
    setResult(validation);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Probar lógica de negocio (Hito 2)</h2>
      <p className="mt-2 text-sm text-slate-600">
        Este panel ejecuta funciones importadas desde src/utils/validations.ts sin duplicar lógica.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          Nombre de la empresa
          <input
            value={form.nombreEmpresa}
            onChange={(event) => setForm({ ...form, nombreEmpresa: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            placeholder="TrackFlow"
          />
        </label>

        <label className="text-sm text-slate-700">
          Persona de contacto
          <input
            value={form.personaContacto}
            onChange={(event) => setForm({ ...form, personaContacto: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            placeholder="Nombre Apellido"
          />
        </label>

        <label className="text-sm text-slate-700">
          Email corporativo
          <input
            type="email"
            value={form.emailCorporativo}
            onChange={(event) => setForm({ ...form, emailCorporativo: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            placeholder="nombre@empresa.com"
          />
        </label>

        <label className="text-sm text-slate-700">
          Teléfono
          <input
            value={form.telefono}
            onChange={(event) => setForm({ ...form, telefono: event.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            placeholder="+1 213 555 0147"
          />
        </label>

        <label className="text-sm text-slate-700">
          Tipo de producto
          <select
            value={form.tipoProducto}
            onChange={(event) => setForm({ ...form, tipoProducto: event.target.value as TipoProducto })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          >
            <option value="Moda">Moda</option>
            <option value="Electrónica">Electrónica</option>
            <option value="Cosmética">Cosmética</option>
            <option value="Alimentación">Alimentación</option>
            <option value="Otro">Otro</option>
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Volumen mensual
          <select
            value={form.volumenMensual}
            onChange={(event) => setForm({ ...form, volumenMensual: event.target.value as VolumenMensual })}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          >
            <option value="0-100">0-100</option>
            <option value="101-500">101-500</option>
            <option value="501-2000">501-2000</option>
            <option value="2000+">2000+</option>
            <option value="No estoy seguro">No estoy seguro</option>
          </select>
        </label>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-700">Servicios de interés</p>
        <div className="flex flex-wrap gap-3">
          {servicioOptions.map((option) => (
            <label key={option} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.serviciosInteres.includes(option)}
                onChange={() => handleServiceToggle(option)}
                className="h-4 w-4"
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.aceptaPrivacidad}
          onChange={(event) => setForm({ ...form, aceptaPrivacidad: event.target.checked })}
          className="h-4 w-4"
        />
        Acepta política de privacidad
      </label>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={handleExecute}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Ejecutar validación
        </button>
        <button
          type="button"
          onClick={() => {
            setForm(initialState);
            setResult(null);
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Limpiar
        </button>
      </div>

      {warning ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{warning}</div>
      ) : null}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Resultado</p>
        <pre className="mt-2 overflow-auto text-xs text-slate-800">
          {JSON.stringify(result ?? { info: "Haz click en 'Ejecutar validación' para ver el resultado." }, null, 2)}
        </pre>
      </div>
    </section>
  );
}
