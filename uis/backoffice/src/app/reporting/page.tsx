"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import {
  reportingService,
  ExecutiveKPI,
  PipelineStatusResponse,
} from "@/services/reporting";
import {
  TrendingUp,
  Headphones,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import styles from "./reporting.module.css";

// Metadata semántica por métrica alineada con CONTEXT-company.md
const METRIC_CONFIG: Record<
  string,
  {
    displayName: string;
    description: string;
    unit: string;
    formatValue: (val: number) => string;
    targetDescription: string;
    isLowerBetter?: boolean;
  }
> = {
  mttr_hours: {
    displayName: "Tiempo Medio de Resolución (MTTR)",
    description: "SLA contractual de atención vs histórico de 48h (Roberto Díaz)",
    unit: "horas",
    formatValue: (v) => `${v.toFixed(1)} h`,
    targetDescription: "Meta contractual: < 24.0 h",
    isLowerBetter: true,
  },
  chatbot_automation_rate: {
    displayName: "Tasa de Automatización del Chatbot",
    description: "% de tickets resueltos por IA de primera línea sin escalar a agentes",
    unit: "%",
    formatValue: (v) => `${v.toFixed(1)}%`,
    targetDescription: "Meta mínima: ≥ 40.0%",
  },
  cvs_ai_scored_count: {
    displayName: "Volumen de CVs Evaluados con IA",
    description: "Cribado inteligente diario para consultores (Javier Almeida)",
    unit: "CVs",
    formatValue: (v) => `${Math.round(v)}`,
    targetDescription: "Meta diaria: ≥ 50 CVs",
  },
  avg_candidate_score: {
    displayName: "Puntuación Promedio de Compatibilidad",
    description: "Score de afinidad de talento y experiencia (escala 0 - 100)",
    unit: "pts",
    formatValue: (v) => `${v.toFixed(1)} pts`,
    targetDescription: "Meta de calidad: ≥ 70.0 pts",
  },
};

export default function ReportingDashboardPage() {
  const [kpis, setKpis] = useState<ExecutiveKPI[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatusResponse | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [kpisData, statusData] = await Promise.all([
        reportingService.getKPIs(selectedDept),
        reportingService.getPipelineStatus(),
      ]);
      setKpis(kpisData.kpis || []);
      setPipelineStatus(statusData);
    } catch (err: any) {
      setError(err.message || "Error al sincronizar datos del panel de reporte");
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTriggerPipeline = async () => {
    try {
      setTriggering(true);
      setActionMessage(null);
      const res = await reportingService.triggerRun();
      setActionMessage(`🚀 ${res.message}`);
      // Esperar 3 segundos para que el flow en background procese y refrescar
      setTimeout(() => {
        fetchData();
        setTriggering(false);
      }, 3500);
    } catch (err: any) {
      setError(err.message || "Error al disparar el pipeline");
      setTriggering(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ON_TRACK":
        return (
          <span className={`${styles.badge} ${styles.badgeOnTrack}`}>
            <CheckCircle2 size={14} /> Cumplido
          </span>
        );
      case "AT_RISK":
        return (
          <span className={`${styles.badge} ${styles.badgeAtRisk}`}>
            <AlertTriangle size={14} /> En Riesgo
          </span>
        );
      case "BREACHED":
        return (
          <span className={`${styles.badge} ${styles.badgeBreached}`}>
            <XCircle size={14} /> Incumplido
          </span>
        );
      default:
        return (
          <span className={`${styles.badge} ${styles.badgeOnTrack}`}>
            {status}
          </span>
        );
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "ON_TRACK":
        return "#22c55e";
      case "AT_RISK":
        return "#eab308";
      case "BREACHED":
        return "#ef4444";
      default:
        return "#3b82f6";
    }
  };

  // Filtrado por departamentos
  const customerSupportKPIs = kpis.filter((k) => k.department === "customer_support");
  const talentAcquisitionKPIs = kpis.filter((k) => k.department === "talent_acquisition");

  return (
    <AuthGuard>
      <main className={styles.container}>
        {/* Header Ejecutivo */}
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.badgeExecutive}>
              <ShieldCheck size={14} /> Panel Ejecutivo de Desempeño
            </span>
            <h1 className={styles.title}>Indicadores Clave de Negocio (KPIs)</h1>
            <p className={styles.subtitle}>
              Métricas consolidadas para Laura Mendoza (CEO) y directores de departamento — Nexova Solutions
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/inventory/products" className={styles.navLink}>
              <Layers size={16} /> Ver Inventario
            </Link>
            <button
              onClick={fetchData}
              disabled={loading}
              className={styles.btnSecondary}
              title="Refrescar datos"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refrescar
            </button>
            <button
              onClick={handleTriggerPipeline}
              disabled={triggering}
              className={styles.btnPrimary}
            >
              <Play size={16} /> {triggering ? "Ejecutando Prefect..." : "Disparar Pipeline"}
            </button>
          </div>
        </header>

        {/* Feedback visual de acciones */}
        {actionMessage && (
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
            {actionMessage}
          </div>
        )}

        {/* Pipeline Status Banner */}
        <section className={styles.statusBanner} aria-label="Estado del Pipeline">
          <div className={styles.statusInfo}>
            <div
              className={
                pipelineStatus?.status === "COMPLETED"
                  ? styles.statusIndicator
                  : styles.statusIndicatorWarning
              }
            />
            <span>
              <strong>Estado del Pipeline Prefect 3:</strong>{" "}
              {pipelineStatus?.status || "Inactivo"}
            </span>
            {pipelineStatus?.started_at && (
              <span style={{ color: "#64748b" }}>
                · Última corrida: {new Date(pipelineStatus.started_at).toLocaleString("es-ES")}
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
            <span>Granularidad: <strong>Diaria</strong></span> ·{" "}
            <span>Destino: <code>reporting.executive_kpis</code></span>
          </div>
        </section>

        {/* Controles de Filtrado */}
        <div className={styles.controlsBar}>
          <div className={styles.departmentTabs}>
            <button
              className={`${styles.tab} ${selectedDept === "all" ? styles.tabActive : ""}`}
              onClick={() => setSelectedDept("all")}
            >
              Todos los Departamentos
            </button>
            <button
              className={`${styles.tab} ${selectedDept === "customer_support" ? styles.tabActive : ""}`}
              onClick={() => setSelectedDept("customer_support")}
            >
              Atención al Cliente
            </button>
            <button
              className={`${styles.tab} ${selectedDept === "talent_acquisition" ? styles.tabActive : ""}`}
              onClick={() => setSelectedDept("talent_acquisition")}
            >
              Operaciones de Selección
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
            <Calendar size={16} />
            <span>Ventana activa: {kpis[0]?.window_date || "Fecha actual"}</span>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "1rem", borderRadius: "10px", marginBottom: "2rem" }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingState}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: "0 auto 1rem" }} />
            <p>Cargando métricas de negocio desde Supabase...</p>
          </div>
        )}

        {/* Renderizado de Secciones de Negocio */}
        {!loading && (
          <>
            {/* 1. SECCIÓN: ATENCIÓN AL CLIENTE */}
            {(selectedDept === "all" || selectedDept === "customer_support") && (
              <section className={styles.departmentSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleGroup}>
                    <h2 className={styles.sectionTitle}>
                      <Headphones size={22} color="#2563eb" /> Atención al Cliente (Outsourcing)
                    </h2>
                    <span className={styles.sectionLeader}>
                      Líder de Área: Roberto Díaz · 30 agentes
                    </span>
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Objetivo: Reducir backlog y acelerar resolución con IA
                  </span>
                </div>

                {customerSupportKPIs.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateTitle}>Sin métricas registradas en este período</p>
                    <p>Ejecuta el pipeline de Prefect para procesar los eventos de telemetría de soporte.</p>
                  </div>
                ) : (
                  <div className={styles.cardsGrid}>
                    {customerSupportKPIs.map((kpi) => {
                      const cfg = METRIC_CONFIG[kpi.metric_name] || {
                        displayName: kpi.metric_name,
                        description: "Indicador operativo de soporte",
                        unit: "",
                        formatValue: (v: number) => `${v}`,
                        targetDescription: `Target: ${kpi.target_value}`,
                      };

                      // Cálculo porcentual para barra de progreso
                      const progressPct =
                        kpi.metric_name === "chatbot_automation_rate"
                          ? Math.min(100, Math.max(0, (kpi.metric_value / kpi.target_value) * 100))
                          : Math.min(100, Math.max(0, 100 - (kpi.metric_value / 48.0) * 100));

                      return (
                        <article key={kpi.kpi_id} className={styles.card}>
                          <div className={styles.cardTop}>
                            <div>
                              <h3 className={styles.cardMetricName}>{cfg.displayName}</h3>
                              <p className={styles.cardDescription}>{cfg.description}</p>
                            </div>
                            {getStatusBadge(kpi.sla_status)}
                          </div>

                          <div className={styles.cardValueRow}>
                            <span className={styles.cardValue}>
                              {cfg.formatValue(kpi.metric_value)}
                            </span>
                          </div>

                          <div className={styles.cardTarget}>
                            <TrendingUp size={14} color="#64748b" />
                            <span className={styles.targetHighlight}>{cfg.targetDescription}</span>
                          </div>

                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{
                                width: `${progressPct}%`,
                                backgroundColor: getProgressColor(kpi.sla_status),
                              }}
                            />
                          </div>

                          <div className={styles.cardMeta}>
                            <span>Período: {kpi.window_date} ({kpi.window_granularity})</span>
                            <span>ID: {kpi.kpi_id.slice(0, 8)}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* 2. SECCIÓN: OPERACIONES DE SELECCIÓN */}
            {(selectedDept === "all" || selectedDept === "talent_acquisition") && (
              <section className={styles.departmentSection}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleGroup}>
                    <h2 className={styles.sectionTitle}>
                      <UserCheck size={22} color="#16a34a" /> Operaciones de Selección (Core Business)
                    </h2>
                    <span className={styles.sectionLeader}>
                      Líder de Área: Javier Almeida · 40 consultores de talento
                    </span>
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Objetivo: Automatizar el cribado de CVs mediante scoring asistido por IA
                  </span>
                </div>

                {talentAcquisitionKPIs.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyStateTitle}>Sin métricas registradas en este período</p>
                    <p>Ejecuta el pipeline de Prefect para procesar los eventos de scoring de candidatos.</p>
                  </div>
                ) : (
                  <div className={styles.cardsGrid}>
                    {talentAcquisitionKPIs.map((kpi) => {
                      const cfg = METRIC_CONFIG[kpi.metric_name] || {
                        displayName: kpi.metric_name,
                        description: "Indicador operativo de selección",
                        unit: "",
                        formatValue: (v: number) => `${v}`,
                        targetDescription: `Target: ${kpi.target_value}`,
                      };

                      const progressPct =
                        kpi.target_value > 0
                          ? Math.min(100, Math.max(0, (kpi.metric_value / kpi.target_value) * 100))
                          : 0;

                      return (
                        <article key={kpi.kpi_id} className={styles.card}>
                          <div className={styles.cardTop}>
                            <div>
                              <h3 className={styles.cardMetricName}>{cfg.displayName}</h3>
                              <p className={styles.cardDescription}>{cfg.description}</p>
                            </div>
                            {getStatusBadge(kpi.sla_status)}
                          </div>

                          <div className={styles.cardValueRow}>
                            <span className={styles.cardValue}>
                              {cfg.formatValue(kpi.metric_value)}
                            </span>
                          </div>

                          <div className={styles.cardTarget}>
                            <TrendingUp size={14} color="#64748b" />
                            <span className={styles.targetHighlight}>{cfg.targetDescription}</span>
                          </div>

                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{
                                width: `${progressPct}%`,
                                backgroundColor: getProgressColor(kpi.sla_status),
                              }}
                            />
                          </div>

                          <div className={styles.cardMeta}>
                            <span>Período: {kpi.window_date} ({kpi.window_granularity})</span>
                            <span>ID: {kpi.kpi_id.slice(0, 8)}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </AuthGuard>
  );
}
