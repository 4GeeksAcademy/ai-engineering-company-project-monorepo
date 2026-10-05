import Link from "next/link";


export default function Home() {

  return (

    <main className="container">

      <section className="hero">

        <span className="eyebrow">
          BRASALAND DIGITAL
        </span>


        <h1>
          Backoffice operativo
        </h1>


        <p>
          Herramientas internas
          para gestión y análisis
          de operaciones.
        </p>


        <Link
          href="/incidents"
          className="button"
        >
          Analizar incidencias
        </Link>

      </section>

    </main>

  );

}
