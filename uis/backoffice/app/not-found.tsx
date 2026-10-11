import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>Candidatura no encontrada</h1>
      <p>No existe una candidatura con ese identificador.</p>
      <Link href="/">Volver al listado</Link>
    </main>
  );
}
