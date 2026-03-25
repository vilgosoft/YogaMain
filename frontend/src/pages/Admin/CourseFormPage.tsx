import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCategories, createCourse, updateCourse } from '@/api/admin.api';
import client from '@/api/client';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/ToastContext';
import type { ApiResponse } from '@/types/api.types';
import type { Category, Course } from '@/types/course.types';
import styles from './AdminPage.module.scss';

export function CourseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = !!id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: '', slug: '', category_id: '', description: '', short_desc: '',
    price: '0', discount_price: '', difficulty: 'beginner', duration_hours: '',
    is_published: '0', is_free: '0', sort_order: '0',
  });

  useEffect(() => {
    const load = async () => {
      const cats = await getCategories();
      setCategories(cats);

      if (isEdit) {
        const res = await client.get<ApiResponse<Course>>(`/admin/courses`, { params: { page: 1, per_page: 100 } });
        const courses = res.data.data as unknown as Course[];
        const course = (courses as Course[]).find((c) => c.id === Number(id));
        if (course) {
          setForm({
            title: course.title, slug: course.slug, category_id: String(course.category_id),
            description: course.description ?? '', short_desc: course.short_desc ?? '',
            price: String(course.price), discount_price: course.discount_price ? String(course.discount_price) : '',
            difficulty: course.difficulty, duration_hours: course.duration_hours ? String(course.duration_hours) : '',
            is_published: String(course.is_published ? 1 : 0), is_free: String(course.is_free ? 1 : 0),
            sort_order: String(course.sort_order),
          });
        }
      }

      setLoading(false);
    };
    load();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      if (!form.slug) {
        formData.set('slug', form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
      }
      if (thumbnail) formData.append('thumbnail', thumbnail);

      if (isEdit) {
        await updateCourse(Number(id), formData);
        showToast('success', 'Course updated');
      } else {
        await createCourse(formData);
        showToast('success', 'Course created');
      }

      navigate('/admin/courses');
    } catch {
      showToast('error', 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size="lg" /></div>;

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        {isEdit ? 'Edit Course' : 'New Course'}
      </h2>

      <form onSubmit={handleSubmit} className={styles.form} style={{ maxWidth: 640 }}>
        <Input label="Title" value={form.title} onChange={set('title')} required />
        <Input label="Slug" value={form.slug} onChange={set('slug')} placeholder="Auto-generated from title" />

        <div className={styles.formRow}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>Category</label>
            <select
              value={form.category_id}
              onChange={set('category_id')}
              required
              style={{
                width: '100%', padding: '0.75rem 1rem', background: '#111427', border: '1px solid #1E2140',
                borderRadius: 8, color: '#fff', fontSize: '1rem',
              }}
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>Difficulty</label>
            <select
              value={form.difficulty}
              onChange={set('difficulty')}
              style={{
                width: '100%', padding: '0.75rem 1rem', background: '#111427', border: '1px solid #1E2140',
                borderRadius: 8, color: '#fff', fontSize: '1rem',
              }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <Input label="Short Description" value={form.short_desc} onChange={set('short_desc')} placeholder="Brief overview (max 500 chars)" />

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={4}
            placeholder="Detailed course description"
            style={{
              width: '100%', padding: '0.75rem 1rem', background: '#111427', border: '1px solid #1E2140',
              borderRadius: 8, color: '#fff', fontSize: '1rem', resize: 'vertical',
            }}
          />
        </div>

        <div className={styles.formRow}>
          <Input label="Price (₹)" type="number" value={form.price} onChange={set('price')} min="0" step="0.01" />
          <Input label="Discount Price (₹)" type="number" value={form.discount_price} onChange={set('discount_price')} min="0" step="0.01" placeholder="Optional" />
        </div>

        <div className={styles.formRow}>
          <Input label="Duration (hours)" type="number" value={form.duration_hours} onChange={set('duration_hours')} min="0" step="0.1" placeholder="e.g., 10.5" />
          <Input label="Sort Order" type="number" value={form.sort_order} onChange={set('sort_order')} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>Thumbnail</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
            style={{ color: '#9CA3AF', fontSize: '0.875rem' }}
          />
        </div>

        <div className={styles.formRow}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C4C7D4', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.is_published === '1'} onChange={(e) => setForm({ ...form, is_published: e.target.checked ? '1' : '0' })} />
            Published
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C4C7D4', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.is_free === '1'} onChange={(e) => setForm({ ...form, is_free: e.target.checked ? '1' : '0' })} />
            Free Course
          </label>
        </div>

        <div className={styles.formActions}>
          <Button variant="secondary" type="button" onClick={() => navigate('/admin/courses')}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{isEdit ? 'Update Course' : 'Create Course'}</Button>
        </div>
      </form>
    </div>
  );
}
