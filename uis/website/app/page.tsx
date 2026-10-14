import { calculateTotalInventoryValue, countProductsByCategory } from "@trackflow/logic";
import { getDemoProducts, getDemoShipments } from "../lib/data";

export default function HomePage() {
  const products = getDemoProducts();
  const shipments = getDemoShipments();
  const totalValue = calculateTotalInventoryValue(products);
  const categoryCounts = countProductsByCategory(products);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      {/* Hero */}
      <section className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-10 shadow-sm md:px-10">
        <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
          Plataforma logística
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          TrackFlow — Monitoriza tu inventario en tiempo real
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Optimiza la selección de transportista por envío, detecta alertas de bajo stock
          y mantén el control total de tu cadena de suministro.
        </p>
      </section>

      {/* KPIs */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Productos activos</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{products.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Valor de inventario</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">${totalValue.toFixed(2)}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Envíos en seguimiento</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{shipments.length}</p>
        </article>
      </section>

      {/* Categorías */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-900">Distribución por categoría</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {(Object.entries(categoryCounts) as [string, number][]).map(([category, count]) => (
            <div
              key={category}
              className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm"
            >
              <p className="text-2xl font-bold text-indigo-600">{count}</p>
              <p className="mt-1 text-sm text-slate-600">{category}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Productos recientes */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-900">Productos destacados</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 6).map((product) => (
            <article
              key={product.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{product.name}</h3>
                  <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    product.status === "Active"
                      ? "bg-green-100 text-green-800"
                      : product.status === "Low stock"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {product.status}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                <div>
                  <span className="text-xs text-slate-400">Stock</span>
                  <p className="font-medium">{product.stockQuantity} uds</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Costo unit.</span>
                  <p className="font-medium">${product.unitCostUSD}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Almacén</span>
                  <p className="font-medium">{product.warehouse}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Categoría</span>
                  <p className="font-medium">{product.category}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
