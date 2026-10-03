import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { CATEGORY_LABELS, ORIGIN_LABELS, type IncidentListItem } from "@repo/shared-types";
import type { SortField, SortOrder } from "../../lib/api";
import StatusBadge from "./StatusBadge";

interface Props {
  items: IncidentListItem[];
  sort: SortField;
  order: SortOrder;
  onSort: (field: SortField) => void;
}

export default function IncidentTable({ items, sort, order, onSort }: Props) {
  const sortable = (field: SortField, label: string) => (
    <th scope="col" className="px-4 py-3" aria-sort={sort === field ? (order === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(field)} className="flex items-center gap-1 uppercase tracking-wider hover:text-white">
        {label}
        {sort === field && (order === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-slate-500">
          <tr>
            {sortable("id", "ID")}
            <th scope="col" className="px-4 py-3 uppercase tracking-wider">Título</th>
            <th scope="col" className="px-4 py-3 uppercase tracking-wider">Categoría</th>
            <th scope="col" className="px-4 py-3 uppercase tracking-wider">Origen</th>
            <th scope="col" className="px-4 py-3 uppercase tracking-wider">Sucursal</th>
            <th scope="col" className="px-4 py-3 uppercase tracking-wider">Estado</th>
            {sortable("created_at", "Creada")}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-t border-slate-800 text-slate-200">
              <td className="whitespace-nowrap px-4 py-3">
                <Link href={`/incidents/${i.id}`} className="font-medium text-cyan-300 hover:underline">
                  {i.id}
                </Link>
              </td>
              <td className="max-w-sm truncate px-4 py-3" title={i.title}>{i.title}</td>
              <td className="whitespace-nowrap px-4 py-3">{CATEGORY_LABELS[i.category]}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-400">{ORIGIN_LABELS[i.origin]}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-400">{i.branch}</td>
              <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-400">{i.created_at.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
