"use client";

import Link from "next/link";
import { Boxes, ClipboardList, FileBarChart, Truck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-white">Backoffice de Nexova</h1>
      <p className="mt-2 text-slate-400">Herramientas internas para el equipo de operaciones.</p>

      <Link
        href="/incidents"
        className="mt-8 flex max-w-sm items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400/40"
      >
        <ClipboardList className="shrink-0 text-cyan-400" size={28} />
        <div>
          <p className="font-semibold text-white">Incidencias</p>
          <p className="text-sm text-slate-400">Registra, filtra y gestiona los tickets de soporte</p>
        </div>
      </Link>

      <Link
        href="/incidents/analysis"
        className="mt-4 flex max-w-sm items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400/40"
      >
        <FileBarChart className="shrink-0 text-cyan-400" size={28} />
        <div>
          <p className="font-semibold text-white">Análisis de incidentes</p>
          <p className="text-sm text-slate-400">Valida y analiza exportes de tickets de soporte</p>
        </div>
      </Link>

      <Link
        href="/suppliers"
        className="mt-4 flex max-w-sm items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400/40"
      >
        <Truck className="shrink-0 text-cyan-400" size={28} />
        <div>
          <p className="font-semibold text-white">Proveedores</p>
          <p className="text-sm text-slate-400">Directorio único de servicios externos y tarifas</p>
        </div>
      </Link>

      <Link
        href="/inventory/products"
        className="mt-4 flex max-w-sm items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-400/40"
      >
        <Boxes className="shrink-0 text-cyan-400" size={28} />
        <div>
          <p className="font-semibold text-white">Inventario de activos</p>
          <p className="text-sm text-slate-400">Stock, entradas y salidas de equipos y materiales</p>
        </div>
      </Link>
    </div>
  );
}
