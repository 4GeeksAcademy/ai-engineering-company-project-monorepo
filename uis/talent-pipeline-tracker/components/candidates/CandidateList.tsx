import type { Candidate } from "@/lib/types";
import { CandidateCard } from "./CandidateCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Pagination } from "@/components/ui/Pagination";

interface CandidateListProps {
  candidates: Candidate[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

export function CandidateList({
  candidates,
  total,
  page,
  totalPages,
  loading,
  error,
  onSelect,
  onPageChange,
  onRetry,
}: CandidateListProps) {
  if (loading) return <LoadingSpinner size="lg" />;

  if (error) return <ErrorMessage message={error} onRetry={onRetry} />;

  if (candidates.length === 0) {
    return (
      <EmptyState
        title="No se encontraron candidatos"
        description="Prueba a ajustar los filtros o crea una nueva aplicación."
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Puesto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                onClick={() => onSelect(c.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
