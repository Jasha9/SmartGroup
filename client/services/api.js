import axios from "axios";
import { emitDataSync } from '@/lib/dataSync';

const defaultBaseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:5000/api" : "/api";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || defaultBaseUrl,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => {
    const method = String(response?.config?.method || '').toLowerCase();
    const isMutation = method === 'post' || method === 'put' || method === 'patch' || method === 'delete';
    if (isMutation) {
      emitDataSync({
        method,
        path: response?.config?.url || '',
        status: response?.status,
      });
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default api;
