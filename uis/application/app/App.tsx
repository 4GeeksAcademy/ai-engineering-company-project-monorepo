import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SuppliersPage from "./suppliers/page";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950">
        <header className="border-b border-slate-800 bg-slate-900/60 px-8 py-4">
          <p className="text-xl font-black text-white">
            nexova<span className="text-cyan-400">.</span>
            <span className="ml-3 text-xs font-medium uppercase tracking-widest text-slate-500">Compras</span>
          </p>
        </header>
        <main className="px-8 py-10">
          <Routes>
            <Route path="/" element={<Navigate to="/suppliers" replace />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
