
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 rounded-2xl bg-white px-8 py-16 shadow-sm dark:bg-zinc-900 sm:px-16">
        <Image
          className="dark:invert h-5 w-[100px]"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Website funcionando en Docker
          </h1>

          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Contenedorización del Monorepo de la Empresa
          </p>
        </div>

        <div className="rounded-xl bg-green-100 px-6 py-4 text-center dark:bg-green-950">
          <p className="font-semibold text-green-800 dark:text-green-300">
            ✓ Website conectado y funcionando
          </p>
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            Next.js 16.4.3 · Docker · Modo desarrollo
          </p>
        </div>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Si ves esta página después de guardar el archivo, el volumen y la
          recarga automática están funcionando.
        </p>
      </main>
    </div>
  );
}
