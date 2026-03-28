import client, { refreshSession } from './client';
import type { ApiResponse } from '@/types/api.types';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth.types';

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await client.post<ApiResponse<AuthResponse>>('/auth/login', data);
  return res.data.data!;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await client.post<ApiResponse<AuthResponse>>('/auth/register', data);
  return res.data.data!;
}

export async function refreshToken(): Promise<AuthResponse> {
  return refreshSession();
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout');
}

export async function getMe(): Promise<User> {
  const res = await client.get<ApiResponse<User>>('/auth/me');
  return res.data.data!;
}

export async function forgotPassword(email: string): Promise<void> {
  await client.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await client.post('/auth/reset-password', { token, password });
}
