import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5002/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 12_000,
});

// ── Request interceptor: attach access token ────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ───────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(error: unknown, token: string | null = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const { refreshToken, setTokens, logout } = useAuthStore.getState();

    if (!refreshToken) {
      logout('expired');
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${API_BASE}/auth/refresh`,
        { refreshToken },
      );
      const { accessToken: newAccess, refreshToken: newRefresh } = res.data;

      setTokens({ accessToken: newAccess, refreshToken: newRefresh });
      original.headers.Authorization = `Bearer ${newAccess}`;
      drainQueue(null, newAccess);
      return apiClient(original);
    } catch (refreshError) {
      drainQueue(refreshError);
      logout('expired');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export function wait(delay = 450) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delay));
}
