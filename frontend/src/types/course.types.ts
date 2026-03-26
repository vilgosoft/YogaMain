export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean | number;
}

export interface Course {
  id: number;
  category_id: number;
  category_name?: string;
  title: string;
  slug: string;
  description: string | null;
  short_desc: string | null;
  thumbnail_url: string | null;
  price: number;
  discount_price: number | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_hours: number | null;
  is_published: boolean;
  is_free: boolean;
  video_count?: number;
  /** Present on catalog/featured when logged in; true if user is enrolled */
  is_enrolled?: boolean;
  sort_order: number;
  created_at: string;
}

export interface Video {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  duration_sec: number | null;
  sort_order: number;
  is_preview: boolean;
  transcode_status: 'pending' | 'processing' | 'complete' | 'failed';
}

export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  course?: Course;
  enrolled_at: string;
  progress_pct: number;
  last_video_id: number | null;
}
