'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/axios'; // Importamos nuestro interceptor de Axios
import { useAuth } from '../../context/AuthContext'; // Importamos el contexto de autenticación


export default function LoginPage() {
    // 1. Manejo del Estado Local del Formulario
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // 2. Herramientas que preparamos en la Fase 1
    const { login } = useAuth();
    const router = useRouter();

    // 3. Función que se ejecuta al presionar "Entrar"
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Evita que la página se recargue por defecto
        setError(null);
        setLoading(true);
        try {
            // Configuramos los datos simulando un formulario clásico (FastAPI espera esto por defecto)
            const formData = new URLSearchParams();
            formData.append('username', email); // Nota: FastAPI usa 'username' internamente, aunque le pasemos el correo
            formData.append('password', password);
            // Hacemos la petición POST a nuestro backend usando nuestra instancia 'api'
            const response = await api.post('/auth/login', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            // 4. ¡Éxito! Guardamos el token recibido usando la función de nuestro AuthContext
            login(response.data.access_token);

            // 5. Redirigimos al usuario a una zona privada (ej. su perfil)
            router.push('/account/profile');

        } catch (err: any) {
            // 6. Manejo de Errores: Qué pasa si las credenciales son incorrectas
            if (err.response?.status === 401) {
                setError('Correo o contraseña incorrectos.');
            } else {
                setError('Ocurrió un error al intentar iniciar sesión. Inténtalo más tarde.');
            }
        } finally {
            setLoading(false); // Detenemos la bolita de carga, haya éxito o error
        }
    };

    // 7. Interfaz Visual (UI)
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Iniciar Sesión</h2>

                {/* Mostrar mensaje de error si existe */}
                {error && (
                    <div className="bg-red-100 text-red-700 p-3 mb-4 rounded text-sm">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@correo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                        <input
                            type="password"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors"
                    >
                        {loading ? 'Cargando...' : 'Entrar'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    ¿No tienes una cuenta? <Link href="/register" className="text-blue-600 hover:underline">Regístrate</Link>
                </p>
            </div>
        </div>
    );
}




