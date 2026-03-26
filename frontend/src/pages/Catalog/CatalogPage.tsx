import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCourses, getCategories } from '@/api/courses.api';
import type { Course, Category } from '@/types/course.types';
import type { PaginationMeta } from '@/types/api.types';
import { CourseGrid } from '@/components/course/CourseGrid/CourseGrid';
import { CategoryFilter } from '@/components/course/CategoryFilter/CategoryFilter';
import { Input } from '@/components/ui/Input/Input';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { PageWrapper } from '@/components/layout/PageWrapper/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import styles from './CatalogPage.module.scss';

export function CatalogPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState<number | null>(
    searchParams.get('category') ? Number(searchParams.get('category')) : null
  );
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    per_page: 12,
    total: 0,
    last_page: 1,
  });

  const fetchCourses = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 12 };
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      const result = await getCourses(params);
      setCourses(result.data);
      setMeta(result.meta);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, isAuthenticated, user?.id]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCourses(1);
  }, [fetchCourses]);

  // Sync filters to URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (categoryId) params.category = String(categoryId);
    setSearchParams(params, { replace: true });
  }, [search, categoryId, setSearchParams]);

  const handleCategoryChange = (id: number | null) => {
    setCategoryId(id);
  };

  // Debounce search
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <PageWrapper>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Explore Courses</h1>
          <p className={styles.subtitle}>
            Discover yoga courses tailored to your level and goals
          </p>
        </div>

        <div className={styles.filters}>
          <CategoryFilter
            categories={categories}
            activeId={categoryId}
            onChange={handleCategoryChange}
          />
          <div className={styles.searchWrap}>
            <Input
              placeholder="Search courses..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              icon={<HiOutlineMagnifyingGlass />}
            />
          </div>
        </div>

        <CourseGrid
          courses={courses}
          loading={loading}
          emptyMessage="No courses match your filters."
          onCourseClick={(course) => navigate(`/courses/${course.slug}`)}
        />

        {meta.last_page > 1 && (
          <Pagination meta={meta} onPageChange={fetchCourses} />
        )}
      </div>
    </PageWrapper>
  );
}
