import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_INVENTORY_API_URL || '/backend-api',
});

// Interceptor para inyectar automáticamente el JWT (Fase 1 - Paso 2)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para atrapar y formatear errores HTTP 4xx y 5xx (Fase 1 - Paso 3)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extraemos el detalle del error que envía nuestra API de FastAPI
    const message = error.response?.data?.detail || error.message || 'Error de conexión con el servidor';
    return Promise.reject(new Error(message));
  }
);

// Definimos los tipos basados en nuestros Pydantic Schemas
export interface Asset {
  id: number;
  name: string;
  sku: string;
  department: string;
  current_stock: number;
}

export interface Order {
  id: number;
  asset_id: number;
  quantity: number;
  created_at: string;
  user_uuid: string;
}

export interface OrdersResponse {
  inbound: Order[];
  outbound: Order[];
}

export const inventoryService = {
  getProducts: async () => {
    const { data } = await api.get<Asset[]>('/inventory/products');
    return data;
  },
  createInboundOrder: async (asset_id: number, quantity: number) => {
    const { data } = await api.post('/inventory/orders/inbound', { asset_id, quantity });
    return data;
  },
  createOutboundOrder: async (asset_id: number, quantity: number) => {
    const { data } = await api.post('/inventory/orders/outbound', { asset_id, quantity });
    return data;
  },
  getOrders: async () => {
    const { data } = await api.get<OrdersResponse>('/inventory/orders');
    return data;
  }
};
