import client from './client';
import type { ApiResponse, PaginationMeta } from '@/types/api.types';
import type { Category, Course, Video } from '@/types/course.types';
import type { User } from '@/types/auth.types';
import type { Transaction } from '@/types/payment.types';

// Dashboard
export async function getDashboardStats(): Promise<Record<string, number>> {
  const res = await client.get<ApiResponse<Record<string, number>>>('/admin/dashboard/stats');
  return res.data.data!;
}

// Categories
export async function getCategories(): Promise<Category[]> {
  const res = await client.get<ApiResponse<Category[]>>('/admin/categories');
  return res.data.data!;
}

export async function createCategory(data: Partial<Category>): Promise<Category> {
  const res = await client.post<ApiResponse<Category>>('/admin/categories', data);
  return res.data.data!;
}

export async function updateCategory(id: number, data: Partial<Category>): Promise<Category> {
  const res = await client.put<ApiResponse<Category>>(`/admin/categories/${id}`, data);
  return res.data.data!;
}

export async function deleteCategory(id: number): Promise<void> {
  await client.delete(`/admin/categories/${id}`);
}

// Courses
interface CoursesResponse {
  data: Course[];
  meta: PaginationMeta;
}

export async function getAdminCourses(params?: Record<string, string | number>): Promise<CoursesResponse> {
  const res = await client.get<ApiResponse<Course[]>>('/admin/courses', { params });
  return { data: res.data.data!, meta: res.data.meta! };
}

export async function createCourse(formData: FormData): Promise<Course> {
  const res = await client.post<ApiResponse<Course>>('/admin/courses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data!;
}

export async function updateCourse(id: number, formData: FormData): Promise<Course> {
  const res = await client.put<ApiResponse<Course>>(`/admin/courses/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data!;
}

export async function deleteCourse(id: number): Promise<void> {
  await client.delete(`/admin/courses/${id}`);
}

// Videos
export async function getCourseVideos(courseId: number): Promise<{ course: Course; videos: Video[] }> {
  const res = await client.get<ApiResponse<{ course: Course; videos: Video[] }>>(`/admin/videos/${courseId}`);
  return res.data.data!;
}

export async function uploadVideo(formData: FormData): Promise<Video> {
  const res = await client.post<ApiResponse<Video>>('/admin/videos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data!;
}

export async function updateVideo(id: number, data: Partial<Video>): Promise<Video> {
  const res = await client.put<ApiResponse<Video>>(`/admin/videos/${id}`, data);
  return res.data.data!;
}

export async function deleteVideo(id: number): Promise<void> {
  await client.delete(`/admin/videos/${id}`);
}

// Users
interface UsersResponse {
  data: (User & { purchased_courses: Array<{ title: string; enrolled_at: string }> })[];
  meta: PaginationMeta;
}

export async function getAdminUsers(params?: Record<string, string | number>): Promise<UsersResponse> {
  const res = await client.get<ApiResponse<UsersResponse['data']>>('/admin/users', { params });
  return { data: res.data.data!, meta: res.data.meta! };
}

export async function updateUser(id: number, data: { is_active?: number; role?: string }): Promise<User> {
  const res = await client.patch<ApiResponse<User>>(`/admin/users/${id}`, data);
  return res.data.data!;
}

// Transactions
interface TransactionsResponse {
  data: Transaction[];
  meta: PaginationMeta;
}

export async function getAdminTransactions(params?: Record<string, string | number>): Promise<TransactionsResponse> {
  const res = await client.get<ApiResponse<Transaction[]>>('/admin/transactions', { params });
  return { data: res.data.data!, meta: res.data.meta! };
}
