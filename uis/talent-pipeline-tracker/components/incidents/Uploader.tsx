'use client';

import React, { useCallback, useState } from 'react';

interface UploaderProps {
  onUploadComplete: (data: any) => void;
  loading: boolean;
  setLoading: (val: boolean) => void;
}

export default function Uploader({ onUploadComplete, loading, setLoading }: UploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError("Por favor, sube un archivo con extensión .csv");
      return;
    }

    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Llamada al backend de FastAPI que creamos en la Fase 2
      const res = await fetch('http://127.0.0.1:8000/api/incidents/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Error al procesar el archivo en el servidor.');
      }

      const data = await res.json();
      onUploadComplete(data);
    } catch (err: any) {
      setError(err.message || 'Hubo un error de conexión con la API.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <form 
        className={`relative flex flex-col items-center justify-center w-full h-80 rounded-2xl border-2 border-dashed transition-all duration-300 ${
          dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-300 bg-white hover:bg-slate-50'
        } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".csv" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
          onChange={handleChange}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4 text-center p-6">
          {loading ? (
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          ) : (
            <div className={`p-4 rounded-full ${dragActive ? 'bg-indigo-100' : 'bg-slate-100'} transition-colors`}>
              <svg className={`w-8 h-8 ${dragActive ? 'text-indigo-600' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
          )}
          
          <div>
            <p className="text-lg font-semibold text-slate-700">
              {loading ? 'Analizando registros...' : 'Arrastra tu CSV aquí'}
            </p>
            {!loading && (
              <p className="text-sm text-slate-500 mt-1">
                o haz clic para explorar tus archivos
              </p>
            )}
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {error}
        </div>
      )}
    </div>
  );
}
