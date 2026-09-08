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
// 3. Interceptor de Respuestas (Response Interceptor)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Si la API nos devuelve un 401 (No Autorizado) o el token expiró:
    if (error.response && error.response.status === 401) {
      // Limpiamos el token viejo/inválido
      localStorage.removeItem('token');
      // Redirigimos al usuario a la pantalla de login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
