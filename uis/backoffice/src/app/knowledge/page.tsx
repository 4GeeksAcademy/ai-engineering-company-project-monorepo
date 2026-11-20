"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import {
  knowledgeService,
  KnowledgeQueryResponse,
} from "@/services/knowledge";
import {
  BookOpen,
  Send,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle,
  FileText,
  TrendingUp,
  Layers,
  ArrowRight,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import styles from "./knowledge.module.css";

interface SuggestedQuery {
  label: string;
  query: string;
}

const SUGGESTED_QUERIES: SuggestedQuery[] = [
  {
    label: "¿Cuál es la garantía de reposición en headhunting?",
    query: "¿Cuál es la garantía de reposición en headhunting?",
  },
  {
    label: "¿Cuáles son los SLAs de resolución para incidencias P1 y P2?",
    query: "¿Cuáles son los SLAs de resolución para incidencias P1 y P2?",
  },
  {
    label: "¿Qué modalidades y bonificaciones aplican a formación corporativa?",
    query: "¿Qué modalidades y bonificaciones aplican a formación corporativa?",
  },
  {
    label: "¿Qué canales integrados cubren las células de outsourcing de soporte?",
    query: "¿Qué canales integrados cubren las células de outsourcing de soporte?",
  },
  {
    label: "🍲 ¿Cómo preparar una paella valenciana? (Test Anti-alucinaciones)",
    query: "¿Cómo preparar una paella valenciana tradicional?",
  },
];

export default function KnowledgePage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KnowledgeQueryResponse | null>(null);

  const handleSubmit = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const queryText = (customQuestion ?? question).trim();
    if (!queryText || loading) return;

    if (customQuestion) {
      setQuestion(customQuestion);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await knowledgeService.queryKnowledgeBase({
        question: queryText,
        k: 5,
        min_score: 0.70,
      });
      setResult(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error inesperado al consultar la base de conocimiento.";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <main className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.badgeExecutive}>
              <Sparkles size={14} /> Nexova Intelligence RAG
            </span>
            <h1 className={styles.title}>Base de Conocimiento Corporativa</h1>
            <p className={styles.subtitle}>
              Motor RAG privado sobre documentación oficial de Nexova Solutions (Políticas de Headhunting, SLAs, Outsourcing y Formación).
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/rfps" className={styles.navLink}>
              <FileText size={16} /> Portal RFPs
            </Link>
            <Link href="/reporting" className={styles.navLink}>
              <TrendingUp size={16} /> Reporting Ejecutivo
            </Link>
            <Link href="/inventory/products" className={styles.navLink}>
              <Layers size={16} /> Inventario
            </Link>
            <Link href="/support-chat" className={styles.navLink}>
              <MessageSquare size={16} /> Chat Soporte
            </Link>
          </div>
        </header>

        {/* Buscador / Input de Consulta */}
        <section className={styles.searchSection}>
          <form onSubmit={handleSubmit} className={styles.searchForm}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Haz una pregunta sobre políticas, servicios o acuerdos de nivel de servicio..."
                className={styles.inputField}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className={styles.btnPrimary}
              >
                {loading ? <Search size={18} className={styles.spinner} /> : <Send size={18} />}
                <span>{loading ? "Buscando..." : "Consultar"}</span>
              </button>
            </div>

            {/* Sugerencias Rápidas */}
            <div className={styles.suggestionsArea}>
              <span className={styles.suggestionsTitle}>Consultas sugeridas de negocio:</span>
              <div className={styles.pillsList}>
                {SUGGESTED_QUERIES.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSubmit(undefined, item.query)}
                    disabled={loading}
                    className={styles.pillBtn}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </section>

        {/* Estado de Error */}
        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={20} />
            <div>
              <strong>Error en la consulta:</strong> {error}
            </div>
          </div>
        )}

        {/* Estado de Carga */}
        {loading && (
          <div className={styles.loadingBox}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>
              Buscando similitudes semánticas en Qdrant y sintetizando respuesta oficial...
            </p>
          </div>
        )}

        {/* Resultado RAG */}
        {result && !loading && (
          <article className={styles.answerCard}>
            <div className={styles.answerHeader}>
              <span className={styles.answerLabel}>
                <BookOpen size={18} color="#2563eb" />
                Respuesta Oficial de Nexova Solutions
              </span>
              {result.sources_count > 0 ? (
                <span className={styles.badgeExecutive}>
                  <CheckCircle size={14} color="#16a34a" /> {result.sources_count} fuentes verificadas
                </span>
              ) : (
                <span className={styles.badgeExecutive} style={{ background: "#fffbeb", color: "#b45309", borderColor: "#fde68a" }}>
                  <ShieldAlert size={14} color="#d97706" /> Sin fuentes (Anti-alucinación)
                </span>
              )}
            </div>

            <div
              className={`${styles.answerContent} ${
                result.sources_count === 0 ? styles.answerRefusal : ""
              }`}
            >
              {result.answer}
            </div>

            {/* Sección de Fuentes / Evidencia */}
            {result.sources && result.sources.length > 0 && (
              <section className={styles.sourcesSection}>
                <div className={styles.sourcesHeader}>
                  <FileText size={16} /> Fragmentos Recuperados de la Documentación Oficial
                </div>

                <div className={styles.sourcesGrid}>
                  {result.sources.map((src, index) => (
                    <div key={index} className={styles.sourceCard}>
                      <div className={styles.sourceMeta}>
                        <span className={styles.sourceDoc}>{src.source_document}</span>
                        <span className={styles.sourceScore}>
                          Similitud: {(src.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className={styles.sourceSection}>{src.section}</div>
                      <div className={styles.sourceText}>{src.text}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </main>
    </AuthGuard>
  );
}

