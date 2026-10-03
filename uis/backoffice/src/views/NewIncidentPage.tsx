"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { Incident, IncidentFacets } from "@repo/shared-types";
import IncidentForm from "../components/incidents/IncidentForm";
import { getIncidentFacets } from "../lib/api";

export default function NewIncidentPage() {
  const [facets, setFacets] = useState<IncidentFacets>({ branches: [], clients: [], agents: [] });
  const [created, setCreated] = useState<Incident | null>(null);
  const confirmation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getIncidentFacets().then(setFacets).catch(() => undefined); // only fills suggestions: the form works without them
  }, []);

  // The form clears itself on success; this moves the attention to the confirmation (also for screen readers).
  useEffect(() => {
    if (created) confirmation.current?.focus();
  }, [created]);

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold text-white">Registrar incidencia</h1>
        <p className="mt-2 text-slate-400">Da de alta una incidencia de un cliente, de una sucursal o interna.</p>
      </header>

      {created && (
        <div
          ref={confirmation}
          tabIndex={-1}
          role="status"
          className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={18} aria-hidden="true" />
          <div>
            <p className="font-semibold text-emerald-100">Incidencia {created.id} registrada correctamente.</p>
            <p className="mt-1 text-emerald-200/80">
              «{created.title}» ({created.origin === "branch" ? `sucursal ${created.branch}` : `sede ${created.branch}`}) está abierta.{" "}
              <Link href={`/incidents/${created.id}`} className="font-medium underline hover:text-white">
                Ver incidencia
              </Link>{" "}
              ·{" "}
              <Link href="/incidents" className="font-medium underline hover:text-white">
                Ir al listado
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <IncidentForm branches={facets.branches} agents={facets.agents} clients={facets.clients} onSaved={setCreated} />
      </div>
    </div>
  );
}
