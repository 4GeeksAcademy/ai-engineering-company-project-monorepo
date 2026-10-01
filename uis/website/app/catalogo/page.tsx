import {
  filterLowStockProducts,
  filterProductsByCategory,
  calculateTotalInventoryValue,
  sortProductsByStock,
} from "@trackflow/logic";
import { getDemoProducts } from "../../lib/data";

export default function CatalogoPage() {
  const allProducts = getDemoProducts();
  const lowStockProducts = filterLowStockProducts(allProducts);
  const electronicsProducts = filterProductsByCategory(allProducts, "Electronics");
  const sortedByStock = sortProductsByStock(allProducts, "desc");

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-6 py-8 shadow-sm md:px-10">
        <p className="inline-block rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-900">
          Catálogo público
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          Catálogo de Productos
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Explora los productos disponibles en los almacenes de TrackFlow.
          Toda la lógica de clasificación y filtrado proviene de <code className="rounded bg-slate-200 px-1.5 py-0.5 text-sm">@trackflow/logic</code>.
        </p>
      </section>

      {/* Alertas de bajo stock */}
      {lowStockProducts.length > 0 && (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-bold text-amber-900">
            ⚠️ Productos con stock bajo ({lowStockProducts.length})
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-amber-200 bg-white p-4"
              >
                <p className="font-semibold text-slate-900">{product.name}</p>
                <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                <p className="mt-2 text-sm">
                  <span className="text-amber-700 font-medium">{product.stockQuantity} uds</span>
                  <span className="text-slate-400"> / mínimo {product.minStockThreshold}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Todos los productos ordenados por stock */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-slate-900">
          Todos los productos (ordenados por stock)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="py-3 pr-4 font-medium">Producto</th>
                <th className="py-3 pr-4 font-medium">SKU</th>
                <th className="py-3 pr-4 font-medium">Categoría</th>
                <th className="py-3 pr-4 font-medium">Stock</th>
                <th className="py-3 pr-4 font-medium">Precio</th>
                <th className="py-3 pr-4 font-medium">Almacén</th>
                <th className="py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sortedByStock.map((product) => (
                <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-900">{product.name}</td>
                  <td className="py-3 pr-4 text-sm text-slate-600">{product.sku}</td>
                  <td className="py-3 pr-4 text-sm text-slate-600">{product.category}</td>
                  <td className="py-3 pr-4 text-sm">
                    <span
                      className={
                        product.stockQuantity <= product.minStockThreshold
                          ? "font-semibold text-amber-700"
                          : "text-slate-700"
                      }
                    >
                      {product.stockQuantity}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-slate-700">
                    ${product.unitCostUSD.toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-sm text-slate-600">{product.warehouse}</td>
                  <td className="py-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
