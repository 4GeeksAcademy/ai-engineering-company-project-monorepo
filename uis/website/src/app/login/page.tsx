'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
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
        } catch (err) {
            // 6. Manejo de Errores: Qué pasa si las credenciales son incorrectas
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                setError('Correo o contraseña incorrectos.');
            } else {
                setError('Ocurrió un error al intentar iniciar sesión. Inténtalo más tarde.');
            }
        } finally {
            setLoading(false); // Detenemos la bolita de carga, haya éxito o error
        }
    };

    // 7. Interfaz Visual (UI) — Emerald Command Center
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0a0d12] px-4 py-12 text-slate-100 overflow-hidden">
            {/* Luz ambiental esmeralda */}
            <div className="pointer-events-none absolute top-[-15%] left-1/2 -translate-x-1/2 h-[480px] w-[760px] rounded-full bg-emerald-500/12 blur-[140px]" />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-500/25 bg-[#121721]/85 p-8 shadow-[0_25px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl">
                <div className="mb-7 flex flex-col items-center text-center">
                    <Link href="/" className="mb-4 flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 font-black text-lg text-[#0a0d12] shadow-lg shadow-emerald-500/25">
                            N
                        </div>
                    </Link>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                        Portal Corporativo B2B
                    </span>
                    <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
                        Iniciar Sesión
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                        Accede al centro de mando de talento, soporte e IA
                    </p>
                </div>

                {/* Mostrar mensaje de error si existe */}
                {error && (
                    <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            required
                            className="mt-1.5 block w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12]/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 transition"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@nexova.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            className="mt-1.5 block w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12]/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 transition"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-3 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center rounded-xl bg-emerald-400 py-3 px-4 text-sm font-bold text-[#0a0d12] shadow-[0_0_25px_rgba(16,185,129,0.35)] transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                        >
                            {loading ? 'Autenticando...' : 'Entrar al Command Center'}
                        </button>
                        <div className="text-center">
                            <Link
                                href="/forgot-password"
                                className="text-xs font-medium text-emerald-400/90 hover:text-emerald-300 hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>
                </form>

                <p className="mt-6 border-t border-emerald-500/15 pt-5 text-center text-xs text-slate-400">
                    ¿No tienes una cuenta?{' '}
                    <Link href="/register" className="font-semibold text-amber-200 hover:underline">
                        Regístrate
                    </Link>
                </p>
            </div>

            {/* Enlace para volver a la Web Oficial */}
            <div className="relative z-10 mt-8">
                <Link
                    href="/"
                    className="flex items-center text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver a la Web Oficial
                </Link>
            </div>
        </div>
    );
}
