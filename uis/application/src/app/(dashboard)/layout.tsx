'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Cargando...</p></div>;
  }

  const menuItems = [
    { name: 'Panel Overview', href: '/admin/panel', icon: '📊', roles: ['admin', 'manager', 'user'] },
    { name: 'Scoring IA', href: '/scoring', icon: '🎯', roles: ['admin', 'manager', 'user'] },
    { name: 'Incidencias', href: '/incidents', icon: '📞', roles: ['admin', 'manager', 'user'] },
    { name: 'Tickets', href: '/admin/tickets', icon: '🎫', roles: ['admin', 'manager', 'user'] },
    { name: 'Proveedores', href: '/suppliers', icon: '📦', roles: ['admin', 'manager', 'user'] },
    { name: 'Soporte IA', href: '/support', icon: '🤖', roles: ['admin', 'manager', 'user'] },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    !user || !user.role || item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-950 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-blue-900/50">
          <h2 className="text-2xl font-bold tracking-wider text-white">Nexova</h2>
          <p className="text-blue-300 text-xs mt-1 uppercase tracking-widest font-semibold">Workspace</p>
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Departamentos</p>
          {visibleMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-800 text-white shadow-sm' 
                    : 'text-blue-200 hover:bg-blue-900 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-900/50 bg-blue-950/80">
          <div className="space-y-1">
            <Link 
              href="/"
              className="flex items-center gap-3 px-4 py-2 text-sm text-blue-200 hover:text-white transition-colors rounded-lg hover:bg-blue-900"
            >
              <span>🌐</span>
              <span className="font-medium">Web Oficial</span>
            </Link>
            <Link 
              href="/account/profile"
              className="flex items-center gap-3 px-4 py-2 text-sm text-blue-200 hover:text-white transition-colors rounded-lg hover:bg-blue-900"
            >
              <span>👤</span>
              <span className="font-medium">Mi Perfil</span>
            </Link>
            <button 
              onClick={logout}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-300 hover:text-white hover:bg-red-900/50 transition-colors rounded-lg"
            >
              <span>🚪</span>
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 shadow-sm shrink-0">
          <nav className="flex text-sm text-gray-500 font-medium" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              <li className="inline-flex items-center">
                <Link href="/admin/panel" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  Dashboard
                </Link>
              </li>
              {pathname.split('/').filter(Boolean).map((segment, index, array) => {
                const isLast = index === array.length - 1;
                const href = `/${array.slice(0, index + 1).join('/')}`;
                
                // Mapeo amistoso de rutas a nombres legibles
                const breadcrumbMap: Record<string, string> = {
                  'admin': 'Admin',
                  'panel': 'Panel Overview',
                  'scoring': 'Scoring IA',
                  'incidents': 'Incidencias',
                  'tickets': 'Tickets IT',
                  'suppliers': 'Proveedores',
                  'support': 'Soporte IA',
                  'account': 'Cuenta',
                  'profile': 'Mi Perfil'
                };
                
                // Omitir 'admin' si va seguido de 'panel' para no repetir
                if (segment === 'admin' && array[index + 1] === 'panel') return null;
                
                // Decodificar posibles parámetros de la URL y usar el mapa si existe
                let label = breadcrumbMap[segment] || decodeURIComponent(segment);
                
                // Si es un número (ej. ID de candidato), mostrar "#ID"
                if (!isNaN(Number(segment))) label = `Detalle #${segment}`;

                return (
                  <li key={href}>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      {isLast ? (
                        <span className="text-blue-950 font-bold capitalize ml-1">{label}</span>
                      ) : (
                        <Link href={href} className="hover:text-blue-600 transition-colors capitalize ml-1">
                          {label}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
