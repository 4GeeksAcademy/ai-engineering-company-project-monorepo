'use client';

import React, { useState } from 'react';
import Uploader from '@/components/incidents/Uploader';
import Dashboard from '@/components/incidents/Dashboard';
import Link from 'next/link';

export default function IncidentsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [errorsCount, setErrorsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <Link 
          href="/" 
          className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 mb-4 font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Volver al Pipeline
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Analizador de Incidencias
        </h1>
        <p className="text-emerald-100/70 mt-2 max-w-2xl">
          Sube el archivo CSV de atención al cliente para procesarlo automáticamente. Nuestro motor detectará anomalías y extraerá las métricas clave en tiempo real.
        </p>
      </div>

      {!metrics && (
        <div className="max-w-3xl mx-auto mt-12">
          <Uploader 
            onUploadComplete={(data) => {
              setMetrics(data.metrics);
              setErrorsCount(data.errores_encontrados);
            }} 
            loading={loading}
            setLoading={setLoading}
          />
        </div>
      )}

      {metrics && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Dashboard 
            metrics={metrics} 
            errorsCount={errorsCount} 
            onReset={() => setMetrics(null)} 
          />
        </div>
      )}
    </div>
  );
}
