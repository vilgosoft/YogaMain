import client from './client';
import type { ApiResponse } from '@/types/api.types';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth.types';
import { localLogin, localLogout, localRefresh, localRegister } from './localAuth';

function shouldUseLocalAuth(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error && !('response' in (error as { response?: unknown }) && (error as { response?: unknown }).response);
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  try {
    const res = await client.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return res.data.data!;
  } catch (error) {
    if (shouldUseLocalAuth(error)) {
      return localLogin(data);
    }
    throw error;
  }
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  try {
    const res = await client.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return res.data.data!;
  } catch (error) {
    if (shouldUseLocalAuth(error)) {
      return localRegister(data);
    }
    throw error;
  }
}

export async function refreshToken(): Promise<AuthResponse> {
  try {
    const res = await client.post<ApiResponse<AuthResponse>>('/auth/refresh');
    return res.data.data!;
  } catch (error) {
    if (shouldUseLocalAuth(error)) {
      return localRefresh();
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await client.post('/auth/logout');
  } catch (error) {
    if (shouldUseLocalAuth(error)) {
      await localLogout();
      return;
    }
    throw error;
  }
}

export async function getMe(): Promise<User> {
  const res = await client.get<ApiResponse<User>>('/auth/me');
  return res.data.data!;
}
