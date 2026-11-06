"use client";

import Link from "next/link";
import { LoadError } from "@/components/LoadError";
import { StockBadge } from "@/components/StockBadge";
import { useLoader } from "@/lib/useLoader";
import { CATEGORY_LABELS, getProducts, type Asset } from "@/lib/inventory";

const NO_ASSETS: Asset[] = [];

export default function InventoryProductsPage() {
  const { data: assets, loading, error, reload: load } = useLoader(getProducts, NO_ASSETS);

  return (
    <main className="wide">
      <div className="page-header">
        <div>
          <h1>Inventario · Activos</h1>
          <p className="muted">Equipos y materiales de Nexova. El stock actual es el neto de entradas menos salidas.</p>
        </div>
        <div className="row-actions">
          <Link className="button" href="/inventory/orders/inbound">Registrar entrada</Link>
          <Link className="button" href="/inventory/orders/outbound">Registrar salida</Link>
        </div>
      </div>

      {error && <LoadError message={error} onRetry={load} busy={loading} />}

      <section className="card">
        <p className="muted small" aria-live="polite">
          {loading ? <><span className="spinner" aria-hidden="true" />Cargando activos…</> : `${assets.length} activos`}
        </p>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Categoría</th>
              <th>Oficina</th>
              <th className="num">Stock actual</th>
              <th>Nivel</th>
              <th><span className="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.name}</td>
                <td><code>{asset.sku}</code></td>
                <td>{CATEGORY_LABELS[asset.category] ?? asset.category}</td>
                <td>{asset.office}</td>
                <td className="num">{asset.current_stock}</td>
                <td><StockBadge stock={asset.current_stock} /></td>
                <td>
                  <div className="row-actions">
                    <Link className="button" href={`/inventory/orders/inbound?productId=${asset.id}`} aria-label={`Registrar entrada de ${asset.name} (${asset.sku})`}>Registrar entrada</Link>
                    <Link className="button" href={`/inventory/orders/outbound?productId=${asset.id}`} aria-label={`Registrar salida de ${asset.name} (${asset.sku})`}>Registrar salida</Link>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !error && assets.length === 0 && (
              <tr><td colSpan={7} className="muted">Todavía no hay activos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
