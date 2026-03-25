import axios from 'axios';
import type { ApiResponse } from '@/types/api.types';
import type { AuthResponse } from '@/types/auth.types';

let accessToken: string | null = null;

/** One in-flight refresh for the whole app — avoids double rotation (Strict Mode / parallel 401s). */
let refreshInFlight: Promise<AuthResponse> | null = null;

export function refreshSession(): Promise<AuthResponse> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = axios
    .post<ApiResponse<AuthResponse>>('/api/auth/refresh', {}, { withCredentials: true })
    .then((res) => {
      const payload = res.data.data;
      if (!payload?.access_token) {
        throw new Error('Refresh failed');
      }
      setAccessToken(payload.access_token);
      return payload;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Attach JWT; do not send application/json for FormData (PHP needs multipart boundary).
client.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    const h = config.headers;
    if (typeof h.delete === 'function') {
      h.delete('Content-Type');
      h.delete('content-type');
    } else {
      delete (h as Record<string, unknown>)['Content-Type'];
      delete (h as Record<string, unknown>)['content-type'];
    }
  } else if (
    config.data !== undefined &&
    config.data !== null &&
    !(typeof config.data === 'string')
  ) {
    config.headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle 401 — try to refresh token once
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if this was already a refresh or login request
    if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return client(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { access_token: newToken } = await refreshSession();

      failedQueue.forEach(({ resolve }) => resolve(newToken));
      failedQueue = [];

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return client(originalRequest);
    } catch (refreshError) {
      failedQueue.forEach(({ reject }) => reject(refreshError));
      failedQueue = [];
      setAccessToken(null);
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;
