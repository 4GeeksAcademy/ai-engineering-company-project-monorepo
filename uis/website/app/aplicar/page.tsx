"use client";

import { FormEvent, useMemo, useState } from "react";

type ApplicationForm = {
  nombre: string;
  email: string;
  telefono: string;
  pais: string;
  experiencia: string;
  puesto: string;
  mensaje: string;
};

const initial: ApplicationForm = {
  nombre: "",
  email: "",
  telefono: "",
  pais: "",
  experiencia: "",
  puesto: "",
  mensaje: "",
};

export default function AplicarPage() {
  const [form, setForm] = useState<ApplicationForm>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const out: Partial<Record<keyof ApplicationForm, string>> = {};

    if (!form.nombre.trim()) out.nombre = "Nombre completo es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      out.email = "Correo electronico invalido.";
    }
    if (!/^[0-9+\-\s]{7,}$/.test(form.telefono)) {
      out.telefono = "Telefono invalido.";
    }
    if (!form.pais) out.pais = "Selecciona un pais.";

    const years = Number(form.experiencia);
    if (Number.isNaN(years) || years < 0 || years > 40) {
      out.experiencia = "Experiencia debe estar entre 0 y 40.";
    }

    if (!form.puesto) out.puesto = "Selecciona un puesto.";
    if (form.mensaje.trim().length < 10) {
      out.mensaje = "Explica tu motivacion en al menos 10 caracteres.";
    }

    return out;
  }, [form]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length === 0) {
      setSubmitted(true);
      setForm(initial);
      setTouched(false);
    }
  };

  return (
    <main className="website-shell form-page">
      <section className="section">
        <p className="eyebrow">Brasaland Careers</p>
        <h1>Formulario de aplicacion</h1>
        <p>Completa tus datos para postularte al equipo Brasaland.</p>
      </section>

      <form className="application-form" onSubmit={onSubmit} noValidate>
        <label>
          Nombre completo
          <input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          {touched && errors.nombre ? <span>{errors.nombre}</span> : null}
        </label>

        <label>
          Correo electronico
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {touched && errors.email ? <span>{errors.email}</span> : null}
        </label>

        <label>
          Telefono
          <input
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
          {touched && errors.telefono ? <span>{errors.telefono}</span> : null}
        </label>

        <label>
          Pais de residencia
          <select
            value={form.pais}
            onChange={(e) => setForm({ ...form, pais: e.target.value })}
          >
            <option value="">Selecciona un pais</option>
            <option value="Colombia">Colombia</option>
            <option value="Estados Unidos">Estados Unidos</option>
          </select>
          {touched && errors.pais ? <span>{errors.pais}</span> : null}
        </label>

        <label>
          Experiencia en restaurantes (anos)
          <input
            type="number"
            min={0}
            max={40}
            value={form.experiencia}
            onChange={(e) => setForm({ ...form, experiencia: e.target.value })}
          />
          {touched && errors.experiencia ? <span>{errors.experiencia}</span> : null}
        </label>

        <label>
          Puesto de interes
          <select
            value={form.puesto}
            onChange={(e) => setForm({ ...form, puesto: e.target.value })}
          >
            <option value="">Selecciona un puesto</option>
            <option value="Cocina">Cocina</option>
            <option value="Servicio">Servicio</option>
            <option value="Administracion">Administracion</option>
          </select>
          {touched && errors.puesto ? <span>{errors.puesto}</span> : null}
        </label>

        <label>
          Por que quieres unirte a Brasaland?
          <textarea
            rows={4}
            value={form.mensaje}
            onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
          />
          {touched && errors.mensaje ? <span>{errors.mensaje}</span> : null}
        </label>

        <button type="submit" className="btn btn-solid">
          Enviar aplicacion
        </button>
        {submitted ? <p className="success">Aplicacion enviada correctamente.</p> : null}
      </form>
    </main>
  );
}
