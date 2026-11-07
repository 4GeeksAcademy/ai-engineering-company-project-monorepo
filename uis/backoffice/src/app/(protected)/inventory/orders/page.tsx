"use client";

import { LoadError } from "@/components/LoadError";
import { useLoader } from "@/lib/useLoader";
import { EXIT_TYPE_LABELS, getOrders, type Order } from "@/lib/inventory";
import { formatDateTime } from "@/lib/suppliersApi";

/** Newest first; the API's order is not relied on. */
function newestFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

const NO_ORDERS: Order[] = [];
const loadOrders = async () => newestFirst(await getOrders());

export default function OrderHistoryPage() {
  const { data: orders, loading, error, reload: load } = useLoader(loadOrders, NO_ORDERS);

  return (
    <main className="wide">
      <h1>Historial de órdenes</h1>
      <p className="muted">Entradas y salidas de activos, de la más reciente a la más antigua. Solo lectura.</p>

      {error && <LoadError message={error} onRetry={load} busy={loading} />}

      <section className="card">
        <p className="muted small" aria-live="polite">
          {loading ? <><span className="spinner" aria-hidden="true" />Cargando órdenes…</> : `${orders.length} órdenes`}
        </p>
        <table>
          <thead>
            <tr>
              <th>Activo</th>
              <th className="num">Cantidad</th>
              <th>Tipo</th>
              <th>Detalle</th>
              <th>Fecha de creación</th>
              <th>Usuario (user_uuid)</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={`${order.order_type}-${order.id}`}>
                <td>{order.asset_name} <code>{order.asset_sku}</code></td>
                <td className="num">{order.order_type === "inbound" ? "+" : "−"}{order.quantity}</td>
                <td>
                  {order.order_type === "inbound"
                    ? <span className="badge inbound"><span aria-hidden="true">▼</span> Entrada</span>
                    : <span className="badge outbound"><span aria-hidden="true">▲</span> Salida</span>}
                </td>
                <td>
                  {order.order_type === "inbound"
                    ? `Proveedor: ${order.supplier}`
                    : `${EXIT_TYPE_LABELS[order.exit_type]}${order.assigned_to ? `: ${order.assigned_to}` : ""}`}
                </td>
                <td>{formatDateTime(order.created_at)}</td>
                <td><code>{order.user_uuid}</code></td>
              </tr>
            ))}
            {!loading && !error && orders.length === 0 && (
              <tr><td colSpan={6} className="muted">Todavía no hay órdenes registradas.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
