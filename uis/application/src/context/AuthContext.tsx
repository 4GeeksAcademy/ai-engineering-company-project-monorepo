'use client'

import React,{createContext, useContext, useState, useEffect} from 'react'
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  user?: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    }
  }, []);

  const fetchUser = async (currentToken: string) => {
    try {
      const res = await fetch('http://localhost:8000/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      // Evitamos exponer detalles en la consola y cerramos sesión preventivamente si falla la auth
      logout();
    }
  };

// 2. Función para iniciar sesión (guarda el token y actualiza el estado) 
  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    fetchUser(newToken);
  };

// 3. Función para cerrar sesión (borra el token y redirige)
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    router.push('/login'); 
  };

// 4. Estado derivado para saber si está autenticado
  const isAuthenticated = !!token;

 // 5. Retornamos el proveedor con los valores para los componentes hijos
  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
};

// 6. Hook personalizado para consumir el contexto fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};