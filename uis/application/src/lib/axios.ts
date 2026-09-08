import axios from 'axios';

// 1. Creamos una instancia centralizada de Axios
const api = axios.create({
  // Reemplaza esto con la URL base de tu backend de FastAPI si es diferente
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor de Peticiones (Request Interceptor)
api.interceptors.request.use(
  (config) => {
    // Este código se ejecuta SIEMPRE, justo milisegundos antes de que la petición 
    // salga hacia el backend.
    
    // Recuperamos el token de la sesión actual
    const token = localStorage.getItem('token');
    
    // Si el usuario tiene un token, lo inyectamos en la cabecera 'Authorization'
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
