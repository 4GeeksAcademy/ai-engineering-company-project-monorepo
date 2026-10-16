"use client";

import { useEffect, useState } from "react";
import { inventoryService, Asset, Order } from "@/lib/inventory";
import { History, ArrowDownToLine, ArrowUpFromLine, ArrowLeft } from "lucide-react";
import Link from "next/link";
import styles from "../products/products.module.css"; // Reutilizamos los estilos base de tablas

// Extendemos el Order localmente para el renderizado
interface ProcessedOrder extends Order {
  type: "inbound" | "outbound";
  assetName: string;
}

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState<ProcessedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Fetch paralelo para cruzar asset_id con su nombre
        const [ordersData, assetsData] = await Promise.all([
          inventoryService.getOrders(),
          inventoryService.getProducts()
        ]);

        const assetsMap = new Map<number, string>();
        assetsData.forEach(a => assetsMap.set(a.id, a.name));

        const processedInbound = ordersData.inbound.map(o => ({
          ...o,
          type: "inbound" as const,
          assetName: assetsMap.get(o.asset_id) || `Activo Desconocido (#${o.asset_id})`
        }));

        const processedOutbound = ordersData.outbound.map(o => ({
          ...o,
          type: "outbound" as const,
          assetName: assetsMap.get(o.asset_id) || `Activo Desconocido (#${o.asset_id})`
        }));

        // Unimos y ordenamos por fecha (más reciente primero)
        const allOrders = [...processedInbound, ...processedOutbound].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setOrders(allOrders);
      } catch (err: any) {
        setError(err.message || "Error al cargar el historial de órdenes");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className={styles.loading}>Cargando historial...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <Link href="/inventory/products" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#64748b", textDecoration: "none", marginBottom: "1rem", fontWeight: 500 }}>
        <ArrowLeft size={16} /> Volver a Productos
      </Link>

      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <History className={styles.titleIcon} size={32} />
          <h1 className={styles.title}>Historial de Órdenes</h1>
        </div>
        <p className={styles.subtitle}>Registro de solo lectura de todas las transacciones de activos</p>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Activo</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Usuario (UUID)</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>No hay transacciones registradas en el sistema.</td>
              </tr>
            ) : (
              orders.map((order) => {
                const isInbound = order.type === "inbound";
                return (
                  <tr key={`${order.type}-${order.id}`} className={styles.row}>
                    <td style={{ color: "#64748b", fontSize: "0.9rem" }}>
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className={styles.assetName}>{order.assetName}</td>
                    <td>
                      {isInbound ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: 600, background: "#dcfce7", color: "#166534" }}>
                          <ArrowDownToLine size={14} /> Entrada
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.85rem", fontWeight: 600, background: "#fee2e2", color: "#991b1b" }}>
                          <ArrowUpFromLine size={14} /> Salida
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: isInbound ? "#16a34a" : "#dc2626" }}>
                      {isInbound ? "+" : "-"}{order.quantity}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#94a3b8", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }} title={order.user_uuid}>
                      {order.user_uuid}
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
