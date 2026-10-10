'use client';

import React from 'react';

interface DashboardProps {
  metrics: any;
  errorsCount: number;
  onReset: () => void;
}

export default function Dashboard({ metrics, errorsCount, onReset }: DashboardProps) {
  const downloadResults = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/incidents/results/export');
      if (!res.ok) throw new Error('Error al descargar CSV');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resultados_incidencias.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("No se pudo descargar el archivo.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Acciones */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-slate-700">Análisis completado en tiempo real</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Subir otro archivo
          </button>
          <button 
            onClick={downloadResults}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tarjetas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total Procesados" value={metrics.total_procesados} icon="📝" />
        <Card title="Válidos" value={metrics.total_validos} icon="✅" color="text-emerald-600" />
        <Card title="Inválidos" value={errorsCount} icon="⚠️" color="text-rose-600" />
        <Card title="Satisfacción Media" value={`${metrics.satisfaccion_media}/100`} icon="⭐" color="text-amber-500" />
      </div>

      {/* Desgloses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Por Categoría</h3>
          <div className="space-y-4">
            {Object.entries(metrics.conteo_categorias).map(([key, value]: any) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-slate-600 capitalize">{key.replace('_', ' ')}</span>
                <span className="font-semibold bg-slate-50 px-3 py-1 rounded-md text-slate-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Por Estado</h3>
          <div className="space-y-4">
            {Object.entries(metrics.conteo_estados).map(([key, value]: any) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-slate-600 capitalize">{key}</span>
                <span className="font-semibold bg-slate-50 px-3 py-1 rounded-md text-slate-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, icon, color = "text-slate-900" }: { title: string, value: string | number, icon: string, color?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-3xl font-black tracking-tight ${color}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 uppercase mt-2">{title}</div>
    </div>
  );
}
