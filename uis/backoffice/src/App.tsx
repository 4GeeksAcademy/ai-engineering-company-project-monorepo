import { MetricCard } from './components/MetricCard'
import { IncidentAnalysis } from './components/IncidentAnalysis'
import { SupplierDirectory } from './app/suppliers/SupplierDirectory'
import { AuthPage } from './components/AuthPage'
import { clearSession, getSessionToken } from './utils/auth'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

const kpis = [
  { label: 'Envios activos hoy', value: '1,284', trend: '+8.2% vs. ayer' },
  { label: 'Entrega a tiempo global', value: '94.1%', trend: '+1.7 pts semanal' },
  { label: 'Tasa de devoluciones', value: '19.4%', trend: '-0.9 pts mensual' },
  { label: 'Incidencias abiertas', value: '37', trend: '-12 casos en 48h' },
]

const warehouseSnapshot = [
  { location: 'Los Angeles', stockVisibility: '86%', lowStockSkus: 41 },
  { location: 'Zaragoza', stockVisibility: '91%', lowStockSkus: 29 },
]

const alerts = [
  'Carrier assignment manual en 23 envios Express de EE.UU.',
  'Ticketing CX unificado pendiente para WhatsApp y correo.',
  'Reglas automaticas de devolucion en validacion con Operaciones.',
]

function App() {
  const [activeView, setActiveView] = useState<'overview' | 'incidents' | 'suppliers'>('overview')
  const path = window.location.pathname.replace(/\/$/, '') || '/'

  if (path === '/login' || path === '/forgot-password' || path === '/reset-password' || path === '/account/change-password') {
    return <AuthPage path={path} />
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="font-display text-2xl font-bold">TrackFlow Backoffice</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">Dashboard de operaciones internas</p>
          </div>
          <nav aria-label="Navegación principal" className="flex flex-wrap gap-2">
            <a href={getSessionToken() ? '/account/change-password' : '/login'} className="rounded-md px-3 py-2 text-sm font-semibold text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">{getSessionToken() ? 'Cambiar contraseña' : 'Iniciar sesión'}</a>
            {getSessionToken() && <button type="button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => { clearSession(); window.location.assign('/login') }} className="flex h-10 w-10 items-center justify-center rounded-md text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"><LogOut size={18} aria-hidden="true" /></button>}
            <button
              type="button"
              aria-current={activeView === 'overview' ? 'page' : undefined}
              onClick={() => setActiveView('overview')}
              className={`rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${activeView === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Operaciones
            </button>
            <button
              type="button"
              aria-current={activeView === 'incidents' ? 'page' : undefined}
              onClick={() => setActiveView('incidents')}
              className={`rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${activeView === 'incidents' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Análisis de incidencias
            </button>
            <button
              type="button"
              aria-current={activeView === 'suppliers' ? 'page' : undefined}
              onClick={() => setActiveView('suppliers')}
              className={`rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${activeView === 'suppliers' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              Proveedores
            </button>
          </nav>
        </div>
      </header>

      {activeView === 'suppliers' ? (
        <main className="mx-auto w-full max-w-6xl px-6 py-8">
          <SupplierDirectory />
        </main>
      ) : activeView === 'incidents' ? (
        <main className="mx-auto w-full max-w-6xl px-6 py-8">
          <IncidentAnalysis />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-8">
        <section aria-labelledby="kpis-title">
          <h2 id="kpis-title" className="font-display text-2xl font-bold text-slate-900">
            Vista de entrada operativa
          </h2>
          <p className="mt-2 text-slate-600">
            Resumen basado en los retos clave de TrackFlow: envios, carriers, devoluciones y experiencia cliente.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                trend={metric.trend}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2" aria-label="Bloques de analitica operativa">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-display text-xl font-semibold">Estado por almacen</h3>
            <ul className="mt-4 space-y-4">
              {warehouseSnapshot.map((warehouse) => (
                <li
                  key={warehouse.location}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-semibold text-slate-800">{warehouse.location}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Visibilidad de inventario: {warehouse.stockVisibility}
                  </p>
                  <p className="text-sm text-slate-600">
                    SKUs bajo minimo: {warehouse.lowStockSkus}
                  </p>
                </li>
              ))}
            </ul>
          </article>

          <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h3 className="font-display text-xl font-semibold text-amber-900">Alertas prioritarias</h3>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-amber-900">
              {alerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          </aside>
        </section>
        </main>
      )}
    </div>
  )
}

export default App
