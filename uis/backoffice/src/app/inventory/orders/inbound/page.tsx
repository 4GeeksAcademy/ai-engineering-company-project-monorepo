"use client";

import { useEffect, useState } from "react";
import { inventoryService, Asset } from "@/lib/inventory";
import { ArrowDownToLine, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import styles from "../orders.module.css";

export default function InboundPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!selectedAssetId || !quantity || Number(quantity) <= 0) {
      setErrorMsg("Por favor selecciona un activo y una cantidad válida mayor a 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryService.createInboundOrder(Number(selectedAssetId), Number(quantity));
      const assetName = assets.find(a => a.id.toString() === selectedAssetId)?.name;
      setSuccessMsg(`¡Éxito! Se registraron ${quantity} unidades de ${assetName}.`);
      
      // Limpiar formulario tras el éxito
      setSelectedAssetId("");
      setQuantity("");
    } catch (err: any) {
      setErrorMsg(err.message || "Hubo un error al registrar la entrada.");
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
          <h1 className={styles.title}>Registrar Entrada de Activos</h1>
          <p className={styles.subtitle}>Añade nuevo stock al inventario corporativo</p>
        </header>

        {successMsg && (
          <div className={styles.successMessage}>
            <CheckCircle2 size={20} />
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className={styles.errorMessage}>
            <AlertCircle size={20} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Activo a ingresar</label>
            <select 
              className={styles.select}
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">-- Selecciona un activo --</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} (SKU: {asset.sku})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Cantidad recibida</label>
            <input 
              type="number" 
              className={styles.input}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              placeholder="Ej: 10"
              disabled={isSubmitting}
            />
          </div>

          <button 
            type="submit" 
            className={`${styles.btnSubmit} ${styles.btnInbound}`}
            disabled={isSubmitting || !selectedAssetId || !quantity}
          >
            <ArrowDownToLine size={20} />
            {isSubmitting ? "Registrando..." : "Confirmar Entrada"}
          </button>
        </form>
      </div>
    </div>
  );
}
