

import Link from "next/link";

const sections = [
  {
    title: "Iniciar sesión",
    description: "Accede a tu cuenta de Brasaland.",
    href: "/login",
    label: "Acceder",
  },
  {
    title: "Crear cuenta",
    description: "Registra un nuevo usuario.",
    href: "/register",
    label: "Registrarse",
  },
  {
    title: "Mi perfil",
    description: "Consulta y actualiza tus datos personales.",
    href: "/account/profile",
    label: "Ver perfil",
  },
  {
    title: "Recuperar contraseña",
    description: "Restablece el acceso a tu cuenta.",
    href: "/reset-password",
    label: "Recuperar acceso",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Brasaland</h1>
            <p className="mt-1 text-sm text-slate-300">
              Backoffice de administración
            </p>
          </div>

          <Link
            href="/login"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            Panel principal
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Bienvenido a Brasaland
          </h2>

          <p className="mt-3 max-w-2xl text-slate-600">
            Desde aquí puedes acceder a las funciones de cuenta y
            administración disponibles en la aplicación.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.href}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold">{section.title}</h3>

              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                {section.description}
              </p>

              <Link
                href={section.href}
                className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                {section.label}
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold">Estado de la API</h3>

          <p className="mt-2 text-sm text-slate-600">
            Consulta la documentación y los endpoints disponibles.
          </p>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            Abrir documentación API
          </a>
        </section>

        <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="font-semibold text-green-800">
            ✓ Backoffice funcionando en Docker
          </p>
          <p className="mt-1 text-sm text-green-700">
            Next.js 16 · Docker · Modo desarrollo · Puerto 3001
          </p>
          <p className="mt-2 text-sm text-green-700">
            Prueba de volúmenes y recarga automática.
          </p>
        </section>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        Brasaland Backoffice
      </footer>
    </main>
  );
}
