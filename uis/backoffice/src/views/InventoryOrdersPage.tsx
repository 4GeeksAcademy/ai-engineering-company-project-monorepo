"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";
import { ErrorBanner, inputClass } from "../components/ui/Field";
import LoadingState from "../components/ui/LoadingState";
import { listUserDirectory } from "../lib/api";
import { listOrders } from "../lib/inventory";
import { formatDateTime } from "../lib/format";
import { authorName, compareOrdersNewestFirst, describeInventoryError, orderDetail } from "../lib/inventoryRules";
import { OFFICES, type InventoryOrder, type Office, type OrderType } from "../types/inventory";

const TYPE_LABELS: Record<OrderType, string> = { inbound: "Entrada", outbound: "Salida" };

/** `/inventory/orders`: read-only history of every entry and exit — asset name, quantity, type, date and the `user_uuid` that created it. */
export default function InventoryOrdersPage() {
  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [namesFailed, setNamesFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<OrderType | "">("");
  const [office, setOffice] = useState<Office | "">("");

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // The names are a nicety: if the directory fails the orders still show, each with its user_uuid, and a note
      // says that the names could not be read (a user missing from a working directory is just a deactivated one).
      let directoryFailed = false;
      const [loaded, directory] = await Promise.all([
        listOrders(),
        listUserDirectory().catch(() => {
          directoryFailed = true;
          return [];
        }),
      ]);
      setNamesFailed(directoryFailed);
      setOrders(loaded);
      setNames(Object.fromEntries(directory.map((entry) => [entry.user_id, entry.name])));
    } catch (err) {
      setError(describeInventoryError(err, "No se pudo cargar el historial de órdenes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Two steps on purpose. Sorting is the expensive part (every comparison parses two dates: ~230 ms for the 30 000
  // orders of the load seed) and only depends on the orders, so it runs once per load. Filtering keeps that order and
  // is what a change of the type/office filter re-runs (~1 ms instead of ~80 ms). Measured in CACHING_REPORT.md.
  const sorted = useMemo(() => [...orders].sort(compareOrdersNewestFirst), [orders]);
  const visible = useMemo(
    () => sorted.filter((o) => (!type || o.type === type) && (!office || o.office === office)),
    [sorted, type, office],
  );

  return (
    <div className="mx-auto max-w-6xl">
      <header>
        <h1 className="text-3xl font-bold text-white">Historial de órdenes</h1>
        <p className="mt-2 text-slate-400">Entradas y salidas de activos, de la más reciente a la más antigua. Solo lectura.</p>
      </header>

      {error && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <ErrorBanner message={error} />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:text-white"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState label="Cargando órdenes…" reserveSpace className="mt-8" />
      ) : (
        !error && (
          <>
            {namesFailed && (
              <p role="status" className="mt-6 text-sm text-amber-300">
                No se pudieron cargar los nombres de los usuarios: cada orden muestra su identificador (user_uuid).
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <select
                aria-label="Filtrar por tipo"
                value={type}
                onChange={(e) => setType(e.target.value as OrderType | "")}
                className={`${inputClass} !w-auto`}
              >
                <option value="">Entradas y salidas</option>
                <option value="inbound">Solo entradas</option>
                <option value="outbound">Solo salidas</option>
              </select>
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
              <p className="text-sm text-slate-400" aria-live="polite">
                {visible.length} de {orders.length} órdenes
              </p>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left">
                <caption className="sr-only">Historial de entradas y salidas de activos</caption>
                <thead className="text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Activo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3">Oficina</th>
                    <th className="px-4 py-3">Detalle</th>
                    <th className="px-4 py-3">Creada por</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-200">
                  {visible.map((o) => (
                    <tr key={`${o.type}-${o.id}`} className="border-t border-slate-800" data-testid="order-row">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDateTime(o.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            o.type === "inbound"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                          }`}
                        >
                          {o.type === "inbound" ? (
                            <ArrowDownToLine size={13} aria-hidden="true" />
                          ) : (
                            <ArrowUpFromLine size={13} aria-hidden="true" />
                          )}
                          {TYPE_LABELS[o.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-white">{o.asset.name}</span>
                        <span className="ml-2 whitespace-nowrap font-mono text-xs text-slate-400">{o.asset.sku}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {o.type === "inbound" ? "+" : "−"}
                        {o.quantity}
                      </td>
                      <td className="px-4 py-3">{o.office}</td>
                      <td className="px-4 py-3 text-slate-300">{orderDetail(o)}</td>
                      <td className="px-4 py-3">
                        <span className="block">{authorName(o.user_uuid, names)}</span>
                        <span className="block font-mono text-[11px] text-slate-400" data-testid="order-user-uuid">
                          {o.user_uuid}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                        {orders.length === 0 ? "Todavía no hay órdenes registradas." : "No hay órdenes con esos filtros."}
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
