'use client'

import React,{createContext, useContext, useState, useEffect, useCallback} from 'react'
import { useRouter, usePathname } from 'next/navigation';

export interface User {
  id?: string;
  email?: string;
  [key: string]: unknown;
}


interface AuthContextType {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  user: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const fetchUser = useCallback(async (currentToken: string) => {
    try{
      const res = await fetch('/auth/me', {
        headers: {Authorization: `Bearer ${currentToken}`}
      });
      if (res.ok){
        const data = await res.json();
        setUser(data);
      }else {
        logout();
      }
    } catch {
      logout()
    }
  }, [logout]);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    }
  }, [fetchUser]);


// 2. Función para iniciar sesión (guarda el token y actualiza el estado) 
  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    fetchUser(newToken);
  };

  const isAuthenticated = !!token;


  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated, user }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};