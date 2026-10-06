"use client";

import { useEffect, useState } from "react";
import { inventoryService, Asset } from "@/lib/inventory";
import { Package, ArrowDownToLine, ArrowUpFromLine, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import styles from "./products.module.css";

export default function ProductsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const data = await inventoryService.getProducts();
        setAssets(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar los activos");
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  // Función para determinar el estado visual del stock
  // Umbrales documentados: > 5 es Saludable, 1-5 es Bajo, 0 es Agotado
  const getStockStatus = (stock: number) => {
    if (stock > 5) return { label: "Saludable", className: styles.statusHealthy, Icon: CheckCircle2 };
    if (stock > 0) return { label: "Bajo", className: styles.statusWarning, Icon: AlertCircle };
    return { label: "Agotado", className: styles.statusDanger, Icon: XCircle };
  };

  if (loading) return <div className={styles.loading}>Cargando inventario...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <Package className={styles.titleIcon} size={32} />
          <h1 className={styles.title}>Activos Corporativos</h1>
        </div>
        <p className={styles.subtitle}>Gestión de stock de licencias y equipamiento (Nexova Solutions)</p>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Activo</th>
              <th scope="col">SKU</th>
              <th scope="col">Departamento</th>
              <th scope="col">Stock Actual</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>No hay activos registrados.</td>
              </tr>
            ) : (
              assets.map((asset) => {
                const status = getStockStatus(asset.current_stock);
                const StatusIcon = status.Icon;
                
                return (
                  <tr key={asset.id} className={styles.row}>
                    <td className={styles.assetName}>{asset.name}</td>
                    <td className={styles.sku}>{asset.sku}</td>
                    <td className={styles.department}>
                      <span className={styles.deptBadge}>{asset.department}</span>
                    </td>
                    <td>
                      <div className={`${styles.stockBadge} ${status.className}`} title={status.label}>
                        <StatusIcon size={16} />
                        <span>{asset.current_stock}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href="/inventory/orders/inbound" className={`${styles.actionBtn} ${styles.btnInbound}`}>
                          <ArrowDownToLine size={16} />
                          Entrada
                        </Link>
                        <Link href="/inventory/orders/outbound" className={`${styles.actionBtn} ${styles.btnOutbound}`}>
                          <ArrowUpFromLine size={16} />
                          Salida
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
