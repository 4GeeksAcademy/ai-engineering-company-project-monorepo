"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { RFPTicket, rfpService } from "@/services/rfps";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileCheck,
    FileText,
    HelpCircle,
    Layers,
    Play,
    RefreshCw,
    Scale,
    ShieldAlert,
    Sparkles,
    TrendingUp,
    Upload,
    UserCheck,
    XCircle,
    Bell,
    MessageSquare,
    Radio,
    WifiOff,
} from "lucide-react";

import {
    RFPTicketCreatedPayload,
    useRFPNotifications,
} from "@/hooks/useRFPNotifications";

const STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; color: string; border: string }
> = {
    analizando: {
        label: "Analizando",
        bg: "rgba(245, 158, 11, 0.15)",
        color: "#fbbf24",
        border: "1px solid rgba(245, 158, 11, 0.4)",
    },
    analisis_completo: {
        label: "Análisis completo",
        bg: "rgba(59, 130, 246, 0.15)",
        color: "#60a5fa",
        border: "1px solid rgba(59, 130, 246, 0.4)",
    },
    generando_borrador: {
        label: "Generando borrador...",
        bg: "rgba(147, 51, 234, 0.15)",
        color: "#c084fc",
        border: "1px solid rgba(147, 51, 234, 0.4)",
    },
    en_evaluacion: {
        label: "En evaluación",
        bg: "rgba(236, 72, 153, 0.15)",
        color: "#f472b6",
        border: "1px solid rgba(236, 72, 153, 0.4)",
    },
    "en_evaluación": {
        label: "En evaluación",
        bg: "rgba(236, 72, 153, 0.15)",
        color: "#f472b6",
        border: "1px solid rgba(236, 72, 153, 0.4)",
    },
    needs_human_review: {
        label: "Needs Human Review",
        bg: "rgba(245, 158, 11, 0.2)",
        color: "#f59e0b",
        border: "1px solid #f59e0b",
    },
    listo_para_aprobacion: {
        label: "Evaluación Aprobada",
        bg: "rgba(16, 185, 129, 0.15)",
        color: "#34d399",
        border: "1px solid rgba(16, 185, 129, 0.4)",
    },
    descartado: {
        label: "Descartado",
        bg: "rgba(148, 163, 184, 0.15)",
        color: "#cbd5e1",
        border: "1px solid rgba(148, 163, 184, 0.35)",
    },
    error: {
        label: "Error",
        bg: "rgba(239, 68, 68, 0.15)",
        color: "#f87171",
        border: "1px solid rgba(239, 68, 68, 0.4)",
    },
};

export default function RFPsPage() {
    const [tickets, setTickets] = useState<RFPTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<RFPTicket | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [loadingList, setLoadingList] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sseToast, setSseToast] = useState<RFPTicketCreatedPayload | null>(null);

    const loadTickets = useCallback(async (activeTicketId?: string) => {
        try {
            const list = await rfpService.listTickets();
            setTickets(list);
            const targetId = activeTicketId ?? selectedTicket?.ticket_id ?? list[0]?.ticket_id;
            if (targetId) {
                const detail = await rfpService.getTicket(targetId);
                setSelectedTicket(detail);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error cargando tickets RFP.");
        } finally {
            setLoadingList(false);
        }
    }, [selectedTicket?.ticket_id]);

    const handleTicketCreated = useCallback((payload: RFPTicketCreatedPayload) => {
        setTickets((prev) => {
            if (prev.some((t) => t.ticket_id === payload.ticket_id)) {
                return prev;
            }
            const incomingTicket: RFPTicket = {
                ticket_id: payload.ticket_id,
                rfp_id: payload.rfp_id,
                filename: payload.filename,
                raw_pdf_path: "",
                status: payload.status,
                client_name: payload.client_name ?? null,
                services_requested: [],
                departments_needed: [],
                readability_metrics: {},
                handoff_payload: {},
                created_at: payload.created_at,
                updated_at: payload.created_at,
                sections: [],
            };
            return [incomingTicket, ...prev];
        });

        setSseToast(payload);
    }, []);

    const handleSSEReconnect = useCallback(async () => {
        await loadTickets();
    }, [loadTickets]);

    const { connectionStatus, reconnectAttempt } = useRFPNotifications({
        onTicketCreated: handleTicketCreated,
        onReconnect: handleSSEReconnect,
    });

    useEffect(() => {
        if (!sseToast) return;
        const timer = setTimeout(() => setSseToast(null), 8000);
        return () => clearTimeout(timer);
    }, [sseToast]);

    useEffect(() => {
        loadTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Polling automático mientras algún ticket esté en proceso
    useEffect(() => {
        const isProcessing = (status?: string) =>
            status === "analizando" ||
            status === "generando_borrador" ||
            status === "en_evaluacion" ||
            status === "en_evaluación";

        const hasPending =
            tickets.some((t) => isProcessing(t.status)) ||
            isProcessing(selectedTicket?.status);

        if (!hasPending) return;

        const timer = setInterval(() => {
            loadTickets(selectedTicket?.ticket_id);
        }, 2500);

        return () => clearInterval(timer);
    }, [tickets, selectedTicket?.status, selectedTicket?.ticket_id, loadTickets]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || uploading) return;

        setUploading(true);
        setError(null);
        try {
            const created = await rfpService.uploadRfp(selectedFile);
            setSelectedFile(null);
            await loadTickets(created.ticket_id);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "No se pudo subir la RFP.");
        } finally {
            setUploading(false);
        }
    };

    const handleTriggerGeneration = async (ticketId: string) => {
        setGenerating(true);
        setError(null);
        try {
            await rfpService.triggerGeneration(ticketId);
            await loadTickets(ticketId);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error al iniciar generación.");
        } finally {
            setGenerating(false);
        }
    };

    const handleSelectTicket = async (ticketId: string) => {
        setError(null);
        try {
            const detail = await rfpService.getTicket(ticketId);
            setSelectedTicket(detail);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error al cargar detalle del ticket.");
        }
    };

    const renderBadge = (statusValue: string) => {
        const cfg = STATUS_CONFIG[statusValue] ?? STATUS_CONFIG.descartado;
        return (
            <span
                style={{
                    background: cfg.bg,
                    color: cfg.color,
                    border: cfg.border,
                    padding: "0.2rem 0.65rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                }}
            >
                {statusValue === "analizando" && <Clock size={12} />}
                {statusValue === "analisis_completo" && <FileCheck size={12} />}
                {statusValue === "generando_borrador" && <RefreshCw size={12} className="animate-spin" />}
                {(statusValue === "en_evaluacion" || statusValue === "en_evaluación") && <Scale size={12} />}
                {statusValue === "needs_human_review" && <AlertTriangle size={12} />}
                {statusValue === "listo_para_aprobacion" && <CheckCircle2 size={12} />}
                {statusValue === "descartado" && <XCircle size={12} />}
                {statusValue === "error" && <AlertCircle size={12} />}
                {cfg.label}
            </span>
        );
    };

    return (
        <AuthGuard>
            <main
                style={{
                    maxWidth: "1320px",
                    margin: "0 auto",
                    padding: "2rem 1.5rem",
                    color: "#f1f5f9",
                }}
            >
                {/* Cabecera */}
                <header
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "1rem",
                        marginBottom: "1.75rem",
                    }}
                >
                    <div>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "#10b981",
                                background: "rgba(16, 185, 129, 0.12)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                padding: "0.25rem 0.7rem",
                                borderRadius: "999px",
                                marginBottom: "0.5rem",
                            }}
                        >
                            <Sparkles size={14} /> Hito 9 · Generación y Evaluación de Respuestas (Parte 2)
                        </span>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
                            Portal de Propuestas y RFPs
                        </h1>
                        <p style={{ color: "#94a3b8", marginTop: "0.35rem", fontSize: "0.9rem" }}>
                            Generación de borradores departamentales con autoevaluación paralela (Legibilidad, Pertinencia y Compliance).
                        </p>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
                        <Link
                            href="/reporting"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                padding: "0.5rem 0.9rem",
                                borderRadius: "0.5rem",
                                background: "#181f2c",
                                border: "1px solid rgba(148, 163, 184, 0.25)",
                                color: "#e2e8f0",
                                fontSize: "0.85rem",
                                textDecoration: "none",
                            }}
                        >
                            <TrendingUp size={15} /> Reporting
                        </Link>
                        <Link
                            href="/knowledge"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                padding: "0.5rem 0.9rem",
                                borderRadius: "0.5rem",
                                background: "#181f2c",
                                border: "1px solid rgba(148, 163, 184, 0.25)",
                                color: "#e2e8f0",
                                fontSize: "0.85rem",
                                textDecoration: "none",
                            }}
                        >
                            <Sparkles size={15} /> Base de Conocimiento
                        </Link>
                        <Link
                            href="/inventory/products"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                padding: "0.5rem 0.9rem",
                                borderRadius: "0.5rem",
                                background: "#181f2c",
                                border: "1px solid rgba(148, 163, 184, 0.25)",
                                color: "#e2e8f0",
                                fontSize: "0.85rem",
                                textDecoration: "none",
                            }}
                        >
                            <Layers size={15} /> Inventario
                        </Link>
                        <Link
                            href="/support-chat"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                padding: "0.5rem 0.9rem",
                                borderRadius: "0.5rem",
                                background: "rgba(16, 185, 129, 0.14)",
                                border: "1px solid rgba(16, 185, 129, 0.4)",
                                color: "#34d399",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                textDecoration: "none",
                            }}
                        >
                            <MessageSquare size={15} /> Chat Soporte
                        </Link>
                    </div>
                </header>

                {sseToast && (
                    <div
                        role="status"
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            padding: "0.85rem 1.1rem",
                            marginBottom: "1.25rem",
                            borderRadius: "0.75rem",
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid rgba(16, 185, 129, 0.55)",
                            color: "#ecfdf5",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <Bell size={18} color="#34d399" />
                            <span style={{ fontSize: "0.9rem" }}>
                                <strong>Nuevo ticket RFP en tiempo real:</strong>{" "}
                                <code>{sseToast.rfp_id}</code> ({sseToast.filename}) · Estado:{" "}
                                <strong>{sseToast.status}</strong> — requiere procesamiento
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                                type="button"
                                onClick={() => {
                                    handleSelectTicket(sseToast.ticket_id);
                                    setSseToast(null);
                                }}
                                style={{
                                    padding: "0.35rem 0.75rem",
                                    borderRadius: "0.4rem",
                                    background: "#10b981",
                                    color: "#06281e",
                                    border: "none",
                                    fontWeight: 700,
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                }}
                            >
                                Ver ticket
                            </button>
                            <button
                                type="button"
                                onClick={() => setSseToast(null)}
                                style={{
                                    padding: "0.35rem 0.7rem",
                                    borderRadius: "0.4rem",
                                    background: "transparent",
                                    color: "#a7f3d0",
                                    border: "1px solid rgba(167, 243, 208, 0.4)",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* Formulario de subida */}
                <section
                    style={{
                        background: "#121721",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: "0.75rem",
                        padding: "1.25rem",
                        marginBottom: "1.5rem",
                    }}
                >
                    <form
                        onSubmit={handleUpload}
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "1rem",
                            justifyContent: "space-between",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                            <FileText size={20} color="#10b981" />
                            <input
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                                style={{ color: "#cbd5e1", fontSize: "0.85rem" }}
                            />
                        </div>

                        <div style={{ display: "flex", gap: "0.65rem" }}>
                            <button
                                type="button"
                                onClick={() => loadTickets(selectedTicket?.ticket_id)}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    padding: "0.55rem 1rem",
                                    borderRadius: "0.5rem",
                                    background: "#181f2c",
                                    border: "1px solid rgba(148, 163, 184, 0.3)",
                                    color: "#f1f5f9",
                                    cursor: "pointer",
                                    fontSize: "0.85rem",
                                }}
                            >
                                <RefreshCw size={15} /> Refrescar
                            </button>
                            <button
                                type="submit"
                                disabled={!selectedFile || uploading}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.45rem",
                                    padding: "0.55rem 1.15rem",
                                    borderRadius: "0.5rem",
                                    background: !selectedFile || uploading ? "#334155" : "#10b981",
                                    border: "none",
                                    color: "#0a0d12",
                                    fontWeight: 700,
                                    cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
                                    fontSize: "0.85rem",
                                }}
                            >
                                <Upload size={15} />
                                {uploading ? "Subiendo..." : "Subir y Analizar RFP"}
                            </button>
                        </div>
                    </form>

                    {error && (
                        <p style={{ color: "#f87171", marginTop: "0.75rem", fontSize: "0.85rem" }}>
                            {error}
                        </p>
                    )}
                </section>

                {/* Grid principal: Lista + Detalle */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(280px, 1fr) minmax(0, 2fr)",
                        gap: "1.25rem",
                        alignItems: "start",
                    }}
                >
                    {/* Lista de tickets */}
                    <section
                        style={{
                            background: "#121721",
                            border: "1px solid rgba(148, 163, 184, 0.2)",
                            borderRadius: "0.75rem",
                            padding: "1rem",
                        }}
                    >
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.85rem" }}>
                            Tickets ({tickets.length})
                        </h2>

                        {loadingList ? (
                            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Cargando tickets...</p>
                        ) : tickets.length === 0 ? (
                            <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                                Aún no hay RFPs procesadas. Sube un PDF para comenzar.
                            </p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                                {tickets.map((t) => {
                                    const isSelected = selectedTicket?.ticket_id === t.ticket_id;
                                    return (
                                        <button
                                            key={t.ticket_id}
                                            type="button"
                                            onClick={() => handleSelectTicket(t.ticket_id)}
                                            style={{
                                                textAlign: "left",
                                                padding: "0.8rem",
                                                borderRadius: "0.6rem",
                                                background: isSelected ? "#181f2c" : "rgba(24, 31, 44, 0.45)",
                                                border: isSelected
                                                    ? "1px solid #10b981"
                                                    : "1px solid rgba(148, 163, 184, 0.15)",
                                                color: "#f1f5f9",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    marginBottom: "0.35rem",
                                                }}
                                            >
                                                <strong style={{ fontSize: "0.82rem", color: "#fde68a" }}>
                                                    {t.rfp_id}
                                                </strong>
                                                {renderBadge(t.status)}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                                                {t.client_name || t.filename}
                                            </div>
                                            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                                                {t.filename}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Detalle del ticket seleccionado */}
                    <section
                        style={{
                            background: "#121721",
                            border: "1px solid rgba(148, 163, 184, 0.2)",
                            borderRadius: "0.75rem",
                            padding: "1.25rem",
                        }}
                    >
                        {!selectedTicket ? (
                            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                                Selecciona un ticket de la lista para ver el análisis y la generación de propuestas.
                            </p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: "0.75rem",
                                        borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
                                        paddingBottom: "0.85rem",
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: "0.8rem", color: "#fde68a", fontWeight: 600 }}>
                                            {selectedTicket.rfp_id} · {selectedTicket.ticket_id}
                                        </div>
                                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0.2rem 0 0" }}>
                                            {selectedTicket.client_name || selectedTicket.filename}
                                        </h2>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                        {renderBadge(selectedTicket.status)}

                                        {/* Botón para disparar generación si está en analisis_completo */}
                                        {selectedTicket.status === "analisis_completo" && (
                                            <button
                                                type="button"
                                                onClick={() => handleTriggerGeneration(selectedTicket.ticket_id)}
                                                disabled={generating}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "0.4rem",
                                                    padding: "0.45rem 0.85rem",
                                                    borderRadius: "0.5rem",
                                                    background: "#2563eb",
                                                    color: "#ffffff",
                                                    border: "none",
                                                    fontSize: "0.8rem",
                                                    fontWeight: 600,
                                                    cursor: generating ? "not-allowed" : "pointer",
                                                }}
                                            >
                                                <Play size={14} />
                                                {generating ? "Iniciando..." : "Generar Propuesta Económica"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {selectedTicket.status === "needs_human_review" && (
                                    <div
                                        style={{
                                            background: "rgba(245, 158, 11, 0.15)",
                                            border: "1px solid #f59e0b",
                                            padding: "0.85rem 1rem",
                                            borderRadius: "0.5rem",
                                            fontSize: "0.85rem",
                                            color: "#fbbf24",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.6rem",
                                        }}
                                    >
                                        <AlertTriangle size={18} />
                                        <span>
                                            <strong>Atención Ventas:</strong> Una o más secciones agotaron el límite de iteraciones sin pasar todas las reglas automáticas. Se conserva el último borrador generado como propuesta provisional para revisión humana.
                                        </span>
                                    </div>
                                )}

                                {/* Metadatos */}
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                                        gap: "0.75rem",
                                    }}
                                >
                                    <div style={{ background: "#181f2c", padding: "0.7rem", borderRadius: "0.5rem" }}>
                                        <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Sede / Moneda</div>
                                        <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                                            {selectedTicket.client_hq || "—"} ({selectedTicket.currency || "—"})
                                        </div>
                                    </div>
                                    <div style={{ background: "#181f2c", padding: "0.7rem", borderRadius: "0.5rem" }}>
                                        <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Fecha límite</div>
                                        <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                                            {selectedTicket.deadline || "No especificada"}
                                        </div>
                                    </div>
                                    <div style={{ background: "#181f2c", padding: "0.7rem", borderRadius: "0.5rem" }}>
                                        <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Presupuesto</div>
                                        <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                                            {selectedTicket.budget_range || "No especificado"}
                                        </div>
                                    </div>
                                </div>

                                {/* Secciones por departamento con Borradores y Evaluaciones */}
                                {selectedTicket.sections && selectedTicket.sections.length > 0 && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>
                                            Propuesta Económica Departamental ({selectedTicket.sections.length})
                                        </h3>

                                        {selectedTicket.sections.map((sec) => {
                                            const evalData = sec.evaluation_results;
                                            return (
                                                <div
                                                    key={sec.department_id}
                                                    style={{
                                                        background: "#181f2c",
                                                        border:
                                                            sec.approval_status === "needs_human_review"
                                                                ? "1px solid #f59e0b"
                                                                : "1px solid rgba(16, 185, 129, 0.25)",
                                                        borderRadius: "0.6rem",
                                                        padding: "1rem",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            marginBottom: "0.6rem",
                                                            flexWrap: "wrap",
                                                            gap: "0.5rem",
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                            <strong style={{ fontSize: "0.95rem", color: "#34d399" }}>
                                                                {sec.department_name}
                                                            </strong>
                                                            <span style={{ fontSize: "0.78rem", color: "#fde68a" }}>
                                                                ({sec.owner_name})
                                                            </span>
                                                        </div>

                                                        {sec.approval_status && renderBadge(sec.approval_status)}
                                                    </div>

                                                    {/* Aspectos Clave */}
                                                    <div style={{ fontSize: "0.82rem", marginBottom: "0.6rem", color: "#cbd5e1" }}>
                                                        <strong>Aspectos clave:</strong>
                                                        <ul style={{ margin: "0.25rem 0 0 1.2rem" }}>
                                                            {sec.key_aspects.map((aspect, idx) => (
                                                                <li key={idx}>{aspect}</li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {/* Borrador Generado */}
                                                    {sec.draft_content ? (
                                                        <div
                                                            style={{
                                                                background: "#121721",
                                                                padding: "0.85rem",
                                                                borderRadius: "0.5rem",
                                                                marginTop: "0.65rem",
                                                                border: "1px solid rgba(148, 163, 184, 0.15)",
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    fontSize: "0.78rem",
                                                                    fontWeight: 600,
                                                                    color: "#60a5fa",
                                                                    marginBottom: "0.4rem",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "0.35rem",
                                                                }}
                                                            >
                                                                <FileText size={14} /> Borrador de la Propuesta Económica:
                                                            </div>
                                                            <pre
                                                                style={{
                                                                    fontSize: "0.8rem",
                                                                    color: "#e2e8f0",
                                                                    whiteSpace: "pre-wrap",
                                                                    fontFamily: "inherit",
                                                                    margin: 0,
                                                                }}
                                                            >
                                                                {sec.draft_content}
                                                            </pre>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            style={{
                                                                fontSize: "0.8rem",
                                                                color: "#94a3b8",
                                                                fontStyle: "italic",
                                                                marginTop: "0.4rem",
                                                            }}
                                                        >
                                                            Borrador pendiente de generación.
                                                        </div>
                                                    )}

                                                    {/* Desglose de Evaluación Estructurada */}
                                                    {evalData && (
                                                        <div
                                                            style={{
                                                                marginTop: "0.75rem",
                                                                padding: "0.75rem",
                                                                borderRadius: "0.5rem",
                                                                background: evalData.overall_pass
                                                                    ? "rgba(16, 185, 129, 0.08)"
                                                                    : "rgba(245, 158, 11, 0.08)",
                                                                border: evalData.overall_pass
                                                                    ? "1px solid rgba(16, 185, 129, 0.3)"
                                                                    : "1px solid rgba(245, 158, 11, 0.3)",
                                                                fontSize: "0.8rem",
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    justifyContent: "space-between",
                                                                    alignItems: "center",
                                                                    marginBottom: "0.35rem",
                                                                }}
                                                            >
                                                                <strong>Resultado de Autoevaluación (Iteración {evalData.iteration}):</strong>
                                                                <span style={{ color: evalData.overall_pass ? "#34d399" : "#fbbf24", fontWeight: 700 }}>
                                                                    {evalData.overall_pass ? "APROBADO" : "REQUIERE ATENCIÓN"}
                                                                </span>
                                                            </div>

                                                            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
                                                                <span>
                                                                    <strong>Legibilidad:</strong> {evalData.readability.passed ? "✓ OK" : "✗ Falló"}
                                                                </span>
                                                                <span>
                                                                    <strong>Pertinencia:</strong> {evalData.relevance.passed ? "✓ OK" : "✗ Falló"}
                                                                </span>
                                                                <span>
                                                                    <strong>Compliance:</strong> {evalData.compliance.passed ? "✓ OK" : "✗ Violaciones detectadas"}
                                                                </span>
                                                            </div>

                                                            {!evalData.overall_pass && evalData.feedback_for_generator && (
                                                                <div style={{ marginTop: "0.4rem", color: "#fcd34d" }}>
                                                                    <em>Feedback: {evalData.feedback_for_generator}</em>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </AuthGuard>
    );
}