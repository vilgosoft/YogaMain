import client from './client';
import type { ApiResponse, PaginationMeta } from '@/types/api.types';
import type { Category, Course, Video } from '@/types/course.types';

// Catalog
interface CoursesResponse {
  data: Course[];
  meta: PaginationMeta;
}

export async function getCourses(params?: Record<string, string | number>): Promise<CoursesResponse> {
  const res = await client.get<ApiResponse<Course[]>>('/courses', { params });
  return { data: res.data.data!, meta: res.data.meta! };
}

export async function getFeaturedCourses(): Promise<Course[]> {
  const res = await client.get<ApiResponse<Course[]>>('/courses/featured');
  return res.data.data!;
}

export interface LandingStats {
  total_users: number;
  total_courses: number;
  total_videos: number;
  total_content_hours: number;
}

export async function getLandingStats(): Promise<LandingStats> {
  const res = await client.get<ApiResponse<LandingStats>>('/stats/landing');
  return res.data.data!;
}

// Course detail
export interface CourseDetailResponse {
  course: Course;
  videos: Pick<Video, 'id' | 'title' | 'description' | 'duration_sec' | 'sort_order' | 'is_preview'>[];
  is_enrolled: boolean;
}

export async function getCourseBySlug(slug: string): Promise<CourseDetailResponse> {
  const res = await client.get<ApiResponse<CourseDetailResponse>>(`/courses/${slug}`);
  return res.data.data!;
}

// Categories
export async function getCategories(): Promise<Category[]> {
  const res = await client.get<ApiResponse<Category[]>>('/categories');
  return res.data.data!;
}

// My Learning
export interface MyLearningEnrollment {
  id: number;
  user_id: number;
  course_id: number;
  enrolled_at: string;
  progress_pct: number;
  last_video_id: number | null;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  short_desc: string | null;
  difficulty: string;
  duration_hours: number | null;
  is_free: boolean;
  category_name: string | null;
  total_videos: number;
  completed_videos: number;
  first_video_id: number | null;
}

export async function getMyLearning(): Promise<MyLearningEnrollment[]> {
  const res = await client.get<ApiResponse<MyLearningEnrollment[]>>('/my-learning');
  return res.data.data!;
}
