'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
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
            await api.post('/users/', {
                email: email,
                password: password,
                profile: {
                    name: name,
                },
            });

            // PASO B: Login Automático
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
        } catch (err) {
            // Manejo de errores (ej: el correo ya estaba registrado)
            if (axios.isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 409)) {
                setError('El correo ingresado ya está registrado o los datos son inválidos.');
            } else {
                setError('Ocurrió un error al intentar registrarte. Inténtalo más tarde.');
            }
        } finally {
            setLoading(false);
        }
    };

    // 3. Interfaz Visual (UI) — Emerald Command Center
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0a0d12] px-4 py-12 text-slate-100 overflow-hidden">
            <div className="pointer-events-none absolute top-[-15%] left-1/2 -translate-x-1/2 h-[480px] w-[760px] rounded-full bg-emerald-500/12 blur-[140px]" />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-500/25 bg-[#121721]/85 p-8 shadow-[0_25px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl">
                <div className="mb-6 flex flex-col items-center text-center">
                    <Link href="/" className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 font-black text-lg text-[#0a0d12] shadow-lg shadow-emerald-500/25">
                            N
                        </div>
                    </Link>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                        Alta de Operador
                    </span>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
                        Crear una Cuenta
                    </h2>
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            required
                            className="mt-1.5 block w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12]/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 transition"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Juan Pérez"
                        />
                    </div>
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
                            placeholder="tu@correo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="mt-1.5 block w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12]/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 transition"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Confirmar Contraseña
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="mt-1.5 block w-full rounded-xl border border-emerald-500/25 bg-[#0a0d12]/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/25 transition"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 w-full flex justify-center rounded-xl bg-emerald-400 py-3 px-4 text-sm font-bold text-[#0a0d12] shadow-[0_0_25px_rgba(16,185,129,0.35)] transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                    >
                        {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                    </button>
                </form>

                <p className="mt-6 border-t border-emerald-500/15 pt-5 text-center text-xs text-slate-400">
                    ¿Ya tienes una cuenta?{' '}
                    <Link href="/login" className="font-semibold text-emerald-400 hover:underline">
                        Inicia Sesión
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
