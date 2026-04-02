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
  // Do not set Content-Type — the browser/axios must add the multipart boundary.
  const res = await client.post<ApiResponse<Course>>('/admin/courses', formData);
  return res.data.data!;
}

export async function updateCourse(id: number, formData: FormData): Promise<Course> {
  const res = await client.post<ApiResponse<Course>>(`/admin/courses/${id}/update`, formData);
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
  const res = await client.post<ApiResponse<Video>>('/admin/videos', formData);
  return res.data.data!;
}

export interface AdminVideoUpdatePayload {
  title?: string;
  description?: string | null;
  duration_sec?: number | null;
  sort_order?: number;
  is_preview?: number;
  video_url?: string;
  captions_url?: string | null;
}

export async function updateVideo(id: number, data: AdminVideoUpdatePayload): Promise<Video> {
  const res = await client.put<ApiResponse<Video>>(`/admin/videos/${id}`, data);
  return res.data.data!;
}

export async function deleteVideo(id: number): Promise<void> {
  await client.delete(`/admin/videos/${id}`);
}

// Users
export interface PurchasedCourseRow {
  course_id: number;
  title: string;
  enrolled_at: string;
}

export interface EnrollmentCourseOption {
  id: number;
  title: string;
  is_published: number;
  is_free: number;
}

interface UsersResponse {
  data: (User & { purchased_courses: PurchasedCourseRow[] })[];
  meta: PaginationMeta;
}

export async function getAdminUsers(params?: Record<string, string | number>): Promise<UsersResponse> {
  const res = await client.get<ApiResponse<UsersResponse['data']>>('/admin/users', { params });
  return { data: res.data.data!, meta: res.data.meta! };
}

export async function updateUser(
  id: number,
  data: {
    is_active?: number;
    role?: string;
    name?: string;
    email?: string;
    phone?: string;
  }
): Promise<User> {
  const res = await client.patch<ApiResponse<User>>(`/admin/users/${id}`, data);
  return res.data.data!;
}

export async function deleteAdminUser(id: number): Promise<void> {
  await client.delete(`/admin/users/${id}`);
}

/**
 * All courses for the enrollment picker. Uses paginated GET /admin/courses only so it works
 * on servers that have not yet deployed the optional /admin/courses/enrollment-options route.
 */
export async function getEnrollmentCourseOptions(): Promise<EnrollmentCourseOption[]> {
  const courses: Course[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const { data, meta } = await getAdminCourses({ page, per_page: 100 });
    courses.push(...data);
    lastPage = meta.last_page;
    page += 1;
  } while (page <= lastPage);

  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    is_published: c.is_published ? 1 : 0,
    is_free: c.is_free ? 1 : 0,
  }));
}

export async function setUserEnrollments(
  userId: number,
  courseIds: number[]
): Promise<{ purchased_courses: PurchasedCourseRow[] }> {
  const res = await client.put<ApiResponse<{ purchased_courses: PurchasedCourseRow[] }>>(
    `/admin/users/${userId}/enrollments`,
    { course_ids: courseIds }
  );
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

export async function deleteAdminTransaction(id: number): Promise<void> {
  await client.delete(`/admin/transactions/${id}`);
}
