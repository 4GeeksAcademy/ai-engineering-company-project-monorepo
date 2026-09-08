'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/axios';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
    // 1. Estado del Formulario (incluye nombre y confirmación de contraseña)
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const router = useRouter();

    // 2. Función que se ejecuta al presionar "Crear Cuenta"
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validación básica en el frontend antes de molestar al backend
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);

        try {
            // PASO A: Crear el usuario en la base de datos
            // (Nota: Si tu backend usa otra ruta como '/users', cámbiala aquí)
            await api.post('/users/', {
                email: email,
                password: password,
                profile: {
                    name: name
                }
            }); // Recompilación forzada

            // PASO B: Login Automático
            // Como el usuario acaba de registrarse, iniciamos su sesión automáticamente
            // para evitar que tenga que volver a escribir todo en la pantalla de login.

            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const loginResponse = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            // Guardamos el token en nuestro contexto
            login(loginResponse.data.access_token);

            // Redirigimos a la zona privada (ej. su perfil)
            router.push('/account/profile');

        } catch (err: any) {
            // Manejo de errores (ej: el correo ya estaba registrado)
            if (err.response?.status === 400 || err.response?.status === 409) {
                setError('El correo ingresado ya está registrado o los datos son inválidos.');
            } else {
                setError('Ocurrió un error al intentar registrarte. Inténtalo más tarde.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 3. Interfaz Visual (UI)
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-12">
            <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Crear una Cuenta</h2>

                {error && (
                    <div className="bg-red-100 text-red-700 p-3 mb-4 rounded text-sm">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-green-500 focus:border-green-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Juan Pérez"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-green-500 focus:border-green-500"
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
                            minLength={6}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-green-500 focus:border-green-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-green-500 focus:border-green-500"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 transition-colors mt-6"
                    >
                        {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    ¿Ya tienes una cuenta? <Link href="/login" className="text-green-600 hover:underline">Inicia Sesión</Link>
                </p>
            </div>
        </div>
    );
}