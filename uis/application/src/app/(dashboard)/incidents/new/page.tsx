'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function NewIncidentPage() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'solicitud',
    origin: 'customer',
    branch: 'central'
  });
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const res = await fetch('http://localhost:8000/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 400) {
          setErrorMsg(data.detail || 'Por favor verifica los campos introducidos.');
        } else {
          setErrorMsg('Ocurrió un problema de red. Intenta más tarde.');
        }
        return;
      }
      
      setSuccessMsg('Incidencia registrada correctamente.');
      setFormData({
        title: '',
        description: '',
        category: 'solicitud',
        origin: 'customer',
        branch: 'central'
      });
    } catch (err) {
      setErrorMsg('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const isBranchOrigin = formData.origin === 'branch';

  return (
    <div className="bg-white text-black min-h-screen py-10">
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Registrar Nueva Incidencia</h1>
      
      {errorMsg && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          {successMsg}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Título Breve</label>
          <input 
            type="text" 
            name="title"
            required
            minLength={5}
            maxLength={150}
            value={formData.title}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500" 
            placeholder="Ej: Problema con servidor en Miami"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción Detallada</label>
          <textarea 
            name="description"
            required
            minLength={20}
            maxLength={1000}
            rows={4}
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500" 
            placeholder="Describe el problema en detalle (mín. 20 caracteres)"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoría</label>
            <select 
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="fallo_operativo">Fallo Operativo</option>
              <option value="queja">Queja</option>
              <option value="solicitud">Solicitud</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Origen del Reporte</label>
            <select 
              name="origin"
              value={formData.origin}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="customer">Cliente</option>
              <option value="branch">Sede Local</option>
              <option value="internal">Interno / Central</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Sede</label>
          <select 
            name="branch"
            value={formData.branch}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md shadow-sm p-2 border transition-colors ${
              isBranchOrigin 
                ? 'border-orange-500 bg-orange-50 focus:border-orange-600 focus:ring-orange-600' 
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
          >
            <option value="central">Central</option>
            <option value="valencia">Valencia, España</option>
            <option value="miami">Miami, Florida</option>
          </select>
          {isBranchOrigin && (
            <p className="mt-1 text-sm text-orange-600 font-medium">Por favor verifica desde qué sede estás reportando.</p>
          )}
        </div>

        <div className="pt-4 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => router.push('/incidents')}
            className="text-gray-600 hover:text-gray-900"
          >
            Volver al listado
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white font-medium ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Enviando...' : 'Registrar Incidencia'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
