"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PackageMinus, PackagePlus, RefreshCw } from "lucide-react";
import { ErrorBanner, inputClass } from "../components/ui/Field";
import StockBadge from "../components/inventory/StockBadge";
import { useAssets } from "../components/inventory/useAssets";
import LoadingState from "../components/ui/LoadingState";
import {
  compareByUrgency,
  countByLevel,
  STOCK_LEVEL_LABELS,
  stockLevel,
  type StockLevel,
} from "../lib/inventoryRules";
import { ASSET_CATEGORIES, CATEGORY_LABELS, OFFICES, type AssetCategory, type Office } from "../types/inventory";

const LEVEL_TILE: Record<StockLevel, string> = {
  empty: "border-rose-500/30 text-rose-300",
  low: "border-amber-500/30 text-amber-300",
  ok: "border-emerald-500/30 text-emerald-300",
};

const STOCK_CELL: Record<StockLevel, string> = {
  empty: "text-rose-300",
  low: "text-amber-300",
  ok: "text-emerald-300",
};

const actionClass =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:border-cyan-400/60 hover:text-white";

/** `/inventory/products`: every asset with its `current_stock`, colour-coded, and a link per row to order for it. */
export default function AssetsPage() {
  const { assets, loading, error, retry } = useAssets();
  const [office, setOffice] = useState<Office | "">("");
  const [category, setCategory] = useState<AssetCategory | "">("");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<StockLevel | "">("");

  const counts = useMemo(() => countByLevel(assets), [assets]);
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return assets
      .filter(
        (a) =>
          (!office || a.office === office) &&
          (!category || a.category === category) &&
          (!level || stockLevel(a.current_stock) === level) &&
          (!needle || a.name.toLowerCase().includes(needle) || a.sku.toLowerCase().includes(needle)),
      )
      .sort(compareByUrgency);
  }, [assets, office, category, level, search]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventario de activos</h1>
          <p className="mt-2 text-slate-400">Stock actual de equipos y materiales en las oficinas de Valencia y Miami.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/inventory/orders/inbound"
            className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            <PackagePlus size={16} />
            Entrada de activos
          </Link>
          <Link
            href="/inventory/orders/outbound"
            className="flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-white"
          >
            <PackageMinus size={16} />
            Salida de activos
          </Link>
        </div>
      </header>

      {error && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <ErrorBanner message={error} />
          </div>
          <button
            type="button"
            onClick={() => void retry()}
            className="flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:text-white"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState label="Cargando inventario…" reserveSpace className="mt-8" />
      ) : (
        !error && (
          <>
            <ul className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Resumen del stock">
              {(["empty", "low", "ok"] as const).map((l) => (
                <li key={l}>
                  <button
                    type="button"
                    onClick={() => setLevel((current) => (current === l ? "" : l))}
                    aria-pressed={level === l}
                    className={`w-full rounded-2xl border bg-slate-900 p-4 text-left transition hover:bg-slate-800 aria-pressed:ring-2 aria-pressed:ring-cyan-400 ${LEVEL_TILE[l]}`}
                  >
                    <span className="block text-3xl font-bold">{counts[l]}</span>
                    <span className="block text-sm">{STOCK_LEVEL_LABELS[l]}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <input
                type="search"
                aria-label="Buscar por nombre o SKU"
                placeholder="Buscar por nombre o SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} !w-64`}
              />
              <select
                aria-label="Filtrar por oficina"
                value={office}
                onChange={(e) => setOffice(e.target.value as Office | "")}
                className={`${inputClass} !w-auto`}
              >
                <option value="">Todas las oficinas</option>
                {OFFICES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar por categoría"
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory | "")}
                className={`${inputClass} !w-auto`}
              >
                <option value="">Todas las categorías</option>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <p className="text-sm text-slate-400" aria-live="polite">
                {visible.length} de {assets.length} activos
              </p>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left">
                <caption className="sr-only">Activos con su stock actual y nivel de stock</caption>
                <thead className="text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Oficina</th>
                    <th className="px-4 py-3 text-right">Stock actual</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Órdenes</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-200">
                  {visible.map((a) => (
                    <tr key={a.id} className="border-t border-slate-800" data-testid="asset-row">
                      <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{a.sku}</td>
                      <td className="px-4 py-3">{CATEGORY_LABELS[a.category]}</td>
                      <td className="px-4 py-3">{a.office}</td>
                      <td className={`px-4 py-3 text-right text-lg font-bold tabular-nums ${STOCK_CELL[stockLevel(a.current_stock)]}`}>
                        {a.current_stock}
                      </td>
                      <td className="px-4 py-3">
                        <StockBadge stock={a.current_stock} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/inventory/orders/inbound?asset=${a.id}`}
                            aria-label={`Registrar entrada de «${a.name}» (${a.sku})`}
                            className={actionClass}
                          >
                            <PackagePlus size={13} aria-hidden="true" />
                            Entrada
                          </Link>
                          <Link
                            href={`/inventory/orders/outbound?asset=${a.id}`}
                            aria-label={`Registrar salida de «${a.name}» (${a.sku})`}
                            className={actionClass}
                          >
                            <PackageMinus size={13} aria-hidden="true" />
                            Salida
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                        {assets.length === 0 ? "Todavía no hay activos registrados." : "No hay activos con esos filtros."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </div>
  );
}
