import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiPlus } from 'react-icons/hi2';
import { getAdminCourses, deleteCourse } from '@/api/admin.api';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { useToast } from '@/components/ui/Toast/ToastContext';
import type { PaginationMeta } from '@/types/api.types';
import type { Course } from '@/types/course.types';
import styles from './AdminPage.module.scss';

export function CoursesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, per_page: 12, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await getAdminCourses({ page, search });
      setCourses(result.data);
      setMeta(result.meta);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (course: Course) => {
    if (!confirm(`Delete "${course.title}"?`)) return;
    try {
      await deleteCourse(course.id);
      showToast('success', 'Course deleted');
      fetchData(meta.page);
    } catch {
      showToast('error', 'Failed to delete course');
    }
  };

  const columns: Column<Course>[] = [
    {
      key: 'thumbnail', header: '',
      render: (r) => r.thumbnail_url
        ? <img src={r.thumbnail_url} alt="" className={styles.thumbnail} />
        : <div className={styles.thumbnail} />,
    },
    { key: 'title', header: 'Title' },
    { key: 'category_name', header: 'Category' },
    { key: 'price', header: 'Price', render: (r) => r.is_free ? 'Free' : `₹${r.price}` },
    { key: 'video_count', header: 'Videos', render: (r) => String(r.video_count ?? 0) },
    {
      key: 'is_published', header: 'Status',
      render: (r) => (
        <span className={`badge ${r.is_published ? 'badge--success' : 'badge--warning'}`}>
          {r.is_published ? 'Published' : 'Draft'}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      render: (r) => (
        <div className={styles.actions}>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/courses/${r.id}/edit`)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/videos/${r.id}`)}>Videos</Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h2>Courses</h2>
        <Button icon={<HiPlus />} onClick={() => navigate('/admin/courses/new')}>Add Course</Button>
      </div>

      <div className={styles.filters}>
        <Input
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable columns={columns} data={courses} loading={loading} keyExtractor={(r) => r.id} />
      <Pagination meta={meta} onPageChange={fetchData} />
    </div>
  );
}
