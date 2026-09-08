'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/axios';
import { useAuth } from '../../../context/AuthContext';

export default function ProfilePage() {
  const { isAuthenticated, logout, token } = useAuth();
  const router = useRouter();

  // 1. Estados de la vista
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 2. Estados editables del formulario
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // 3. Efecto para Cargar Datos (Se ejecuta al entrar a la página)
  useEffect(() => {
    // Si no está autenticado y no hay token, lo echamos por la fuerza al login
    if (!isAuthenticated && !token) {
      router.push('/login');
      return;
    }
    const fetchProfile = async () => {
      try {
        // Hacemos un GET a la ruta protegida de nuestro backend
        // Nuestro interceptor de Axios añadirá silenciosamente: Authorization: Bearer <token>
        const response = await api.get('/auth/me'); 
        const data = response.data;
        
        // Guardamos los datos recibidos
        setProfile(data);
        setName(data.full_name || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        
      } catch (err: any) {
        console.error("Error cargando perfil", err);
        setError("No se pudo cargar el perfil.");
        // Si el backend nos responde 401 (token expirado o inválido), cerramos sesión forzosamente
        if (err.response?.status === 401) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isAuthenticated, token, router, logout]);
  // 4. Función para guardar los cambios
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Hacemos un PUT a la ruta protegida para actualizar el perfil
      const response = await api.put('/profiles/me', {
        full_name: name,
        phone: phone,
        address: address
      });
      setProfile(response.data); // Actualizamos la variable con lo que el backend confirmó
      setSuccess("¡Perfil actualizado con éxito!");
    } catch (err) {
      setError("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };
  // 5. Interfaz mientras carga los datos
  if (loading) return <div className="p-8 text-center text-gray-500">Cargando perfil seguro...</div>;
  // 6. Interfaz Visual (UI)
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        
        {/* Cabecera y botón de Logout */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <button 
            onClick={logout} 
            className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 transition-colors font-medium"
          >
            Cerrar Sesión
          </button>
        </div>
        {/* Alertas */}
        {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded text-sm">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 mb-4 rounded text-sm">{success}</div>}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Correo Electrónico (Como identificador principal, suele ser de solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico (No editable)</label>
            <input 
              type="email" 
              disabled 
              className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
              value={profile?.email || ''}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
            <input 
              type="text" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input 
              type="tel" 
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Dirección</label>
            <textarea 
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}