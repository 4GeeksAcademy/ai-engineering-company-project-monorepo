"use client";

import { useEffect, useState } from "react";
import { inventoryService, Asset } from "@/lib/inventory";
import { ArrowUpFromLine, ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import styles from "../orders.module.css";

export default function OutboundPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado del formulario
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const data = await inventoryService.getProducts();
        setAssets(data);
      } catch (err: any) {
        setErrorMsg(err.message || "No se pudieron cargar los activos.");
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  // Reactividad crítica: Encontrar el activo seleccionado para mostrar su stock
  const selectedAsset = assets.find(a => a.id.toString() === selectedAssetId);
  const currentStock = selectedAsset?.current_stock || 0;
  
  // Salvaguarda UX: Verificar si la cantidad tipeada supera el stock visible
  const numQuantity = Number(quantity);
  const exceedsStock = selectedAssetId !== "" && numQuantity > currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!selectedAssetId || !quantity || numQuantity <= 0) {
      setErrorMsg("Por favor selecciona un activo y una cantidad válida mayor a 0.");
      return;
    }

    // La UI previene el envío, pero lo validamos igual por si acaso
    if (exceedsStock) {
      setErrorMsg("No puedes retirar más activos de los que hay disponibles.");
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryService.createOutboundOrder(Number(selectedAssetId), numQuantity);
      setSuccessMsg(`¡Éxito! Se asignaron ${quantity} unidades de ${selectedAsset?.name}.`);
      
      // Actualizamos el stock localmente para reflejar la reducción sin volver a hacer fetch completo
      setAssets(assets.map(a => 
        a.id.toString() === selectedAssetId 
          ? { ...a, current_stock: a.current_stock - numQuantity } 
          : a
      ));
      
      // Limpiamos la cantidad, pero dejamos el activo seleccionado para conveniencia
      setQuantity("");
    } catch (err: any) {
      // AQUÍ: Manejo explícito del HTTP 400 renderizándolo inline en la interfaz
      setErrorMsg(err.message || "Error devuelto por la API al registrar la salida.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className={styles.loading}>Cargando formulario...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <Link href="/inventory/products" className={styles.backLink}>
        <ArrowLeft size={16} /> Volver a Productos
      </Link>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Registrar Salida de Activos</h1>
          <p className={styles.subtitle}>Asignar equipamiento a empleados o departamentos</p>
        </header>

        {successMsg && (
          <div className={styles.successMessage}>
            <CheckCircle2 size={20} />
            {successMsg}
          </div>
        )}

        {/* Muestra el error de la API (ej. HTTP 400) inline y legible */}
        {errorMsg && (
          <div className={styles.errorMessage}>
            <AlertCircle size={20} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Activo a asignar</label>
            <select 
              className={styles.select}
              value={selectedAssetId}
              onChange={(e) => {
                setSelectedAssetId(e.target.value);
                setQuantity(""); // Limpiar cantidad si cambia de producto
              }}
              disabled={isSubmitting}
            >
              <option value="">-- Selecciona un activo --</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} (Dep: {asset.department})
                </option>
              ))}
            </select>
            
            {/* Mostrar stock disponible dinámicamente ANTES de enviar */}
            {selectedAsset && (
              <div className={`${styles.stockInfo} ${currentStock === 0 ? styles.stockDanger : styles.stockHealthy}`}>
                <span>Stock disponible actualmente:</span>
                <strong>{currentStock} unidades</strong>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Cantidad a retirar</label>
            <input 
              type="number" 
              className={`${styles.input} ${exceedsStock ? styles.stockDanger : ""}`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              placeholder="Ej: 5"
              disabled={isSubmitting || !selectedAssetId || currentStock === 0}
            />
            
            {/* Salvaguarda UX: Advertencia en cliente si quantity > currentStock */}
            {exceedsStock && (
              <div className={styles.warningBanner}>
                <AlertTriangle size={16} />
                La cantidad supera el stock disponible ({currentStock}). La transacción será rechazada.
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className={`${styles.btnSubmit} ${styles.btnOutbound}`}
            disabled={isSubmitting || !selectedAssetId || !quantity || exceedsStock || currentStock === 0}
          >
            <ArrowUpFromLine size={20} />
            {isSubmitting ? "Procesando..." : "Confirmar Salida"}
          </button>
        </form>
      </div>
    </div>
  );
}
