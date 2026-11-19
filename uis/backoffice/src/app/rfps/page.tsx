"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { RFPTicket, rfpService } from "@/services/rfps";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    FileText,
    HelpCircle,
    Layers,
    RefreshCw,
    Sparkles,
    TrendingUp,
    Upload,
    XCircle,
} from "lucide-react";

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
    const [loadingList, setLoadingList] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        loadTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Polling automático mientras algún ticket siga en "analizando"
    useEffect(() => {
        const hasPending =
            tickets.some((t) => t.status === "analizando") ||
            selectedTicket?.status === "analizando";

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
                {statusValue === "analisis_completo" && <CheckCircle2 size={12} />}
                {statusValue === "descartado" && <XCircle size={12} />}
                {statusValue === "error" && <AlertTriangle size={12} />}
                {cfg.label}
            </span>
        );
    };

    return (
        <AuthGuard>
            <main
                style={{
                    maxWidth: "1280px",
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
                            <Sparkles size={14} /> Hito 9 · Recepción y Enrutamiento de RFPs
                        </span>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
                            Portal de Tickets RFP
                        </h1>
                        <p style={{ color: "#94a3b8", marginTop: "0.35rem", fontSize: "0.9rem" }}>
                            Sube una RFP en PDF para clasificarla, medir legibilidad y enrutar aspectos clave a Selección, Capacitación y Soporte.
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
                    </div>
                </header>

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
                                Selecciona un ticket de la lista para ver el análisis y el enrutamiento departamental.
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
                                    {renderBadge(selectedTicket.status)}
                                </div>

                                {selectedTicket.classification_reason && (
                                    <div
                                        style={{
                                            background: "#181f2c",
                                            padding: "0.75rem 0.9rem",
                                            borderRadius: "0.5rem",
                                            fontSize: "0.85rem",
                                            color: "#cbd5e1",
                                        }}
                                    >
                                        <strong>Triage:</strong> {selectedTicket.classification_reason}
                                    </div>
                                )}

                                {selectedTicket.error_detail && (
                                    <div
                                        style={{
                                            background: "rgba(239, 68, 68, 0.12)",
                                            border: "1px solid rgba(239, 68, 68, 0.35)",
                                            padding: "0.75rem 0.9rem",
                                            borderRadius: "0.5rem",
                                            fontSize: "0.85rem",
                                            color: "#fca5a5",
                                        }}
                                    >
                                        <strong>Detalle del error:</strong> {selectedTicket.error_detail}
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

                                {/* Resumen de Ventas */}
                                {selectedTicket.synthesizer_summary && (
                                    <div style={{ background: "#181f2c", padding: "0.9rem", borderRadius: "0.5rem" }}>
                                        <h3 style={{ fontSize: "0.92rem", fontWeight: 600, marginBottom: "0.45rem" }}>
                                            Resumen Ejecutivo (Ventas)
                                        </h3>
                                        <p style={{ fontSize: "0.85rem", color: "#cbd5e1", whiteSpace: "pre-wrap", margin: 0 }}>
                                            {selectedTicket.synthesizer_summary}
                                        </p>
                                    </div>
                                )}

                                {/* Secciones por departamento */}
                                {selectedTicket.sections && selectedTicket.sections.length > 0 && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                                        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
                                            Enrutamiento Departamental ({selectedTicket.sections.length})
                                        </h3>

                                        {selectedTicket.sections.map((sec) => (
                                            <div
                                                key={sec.department_id}
                                                style={{
                                                    background: "#181f2c",
                                                    border: "1px solid rgba(16, 185, 129, 0.25)",
                                                    borderRadius: "0.6rem",
                                                    padding: "0.9rem",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        marginBottom: "0.5rem",
                                                    }}
                                                >
                                                    <strong style={{ fontSize: "0.95rem", color: "#34d399" }}>
                                                        {sec.department_name}
                                                    </strong>
                                                    <span style={{ fontSize: "0.78rem", color: "#fde68a" }}>
                                                        Responsable: {sec.owner_name}
                                                    </span>
                                                </div>

                                                <div style={{ fontSize: "0.83rem", marginBottom: "0.5rem" }}>
                                                    <strong>Aspectos clave:</strong>
                                                    <ul style={{ margin: "0.3rem 0 0 1.2rem", color: "#e2e8f0" }}>
                                                        {sec.key_aspects.map((aspect, idx) => (
                                                            <li key={idx}>{aspect}</li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {sec.open_questions && sec.open_questions.length > 0 && (
                                                    <div
                                                        style={{
                                                            marginTop: "0.6rem",
                                                            padding: "0.6rem 0.75rem",
                                                            borderRadius: "0.45rem",
                                                            background: "rgba(245, 158, 11, 0.12)",
                                                            border: "1px solid rgba(245, 158, 11, 0.3)",
                                                            fontSize: "0.8rem",
                                                            color: "#fcd34d",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "0.35rem",
                                                                fontWeight: 600,
                                                                marginBottom: "0.25rem",
                                                            }}
                                                        >
                                                            <HelpCircle size={14} /> Preguntas abiertas (datos no especificados en la RFP)
                                                        </div>
                                                        <ul style={{ margin: "0 0 0 1.1rem" }}>
                                                            {sec.open_questions.map((q, idx) => (
                                                                <li key={idx}>{q}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
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