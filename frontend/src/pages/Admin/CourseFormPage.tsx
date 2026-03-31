import { useState, useEffect, type CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCategories, createCourse, updateCourse } from '@/api/admin.api';
import client from '@/api/client';
import { getApiErrorMessage } from '@/utils/apiErrors';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
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
    is_published: '0', is_free: '0', is_upcoming: '0', sort_order: '0',
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
            is_upcoming: String(course.is_upcoming ? 1 : 0),
            sort_order: String(course.sort_order),
          });
        }
      }

      setLoading(false);
    };
    load();
  }, [id, isEdit]);

  const slugFromTitle = (title: string) => {
    const s = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return s || 'course';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      if (!form.slug.trim()) {
        formData.set('slug', slugFromTitle(form.title));
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
    } catch (err: unknown) {
      showToast('error', getApiErrorMessage(err, 'Failed to save course'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size="lg" /></div>;

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const labelMuted: CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    marginBottom: '0.5rem',
  };
  const selectField: CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    color: 'var(--color-text)',
    fontSize: '1rem',
  };
  const checkboxLabel: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--color-text-secondary)',
    fontSize: '0.875rem',
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-text)' }}>
        {isEdit ? 'Edit Course' : 'New Course'}
      </h2>

      <form onSubmit={handleSubmit} className={styles.form} style={{ maxWidth: 640 }}>
        <Input label="Title" value={form.title} onChange={set('title')} required />
        <Input label="Slug" value={form.slug} onChange={set('slug')} placeholder="Auto-generated from title" />

        <div className={styles.formRow}>
          <div>
            <label style={labelMuted}>Category</label>
            <select
              value={form.category_id}
              onChange={set('category_id')}
              required
              style={selectField}
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelMuted}>Difficulty</label>
            <select
              value={form.difficulty}
              onChange={set('difficulty')}
              style={selectField}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <Input label="Short Description" value={form.short_desc} onChange={set('short_desc')} placeholder="Brief overview (max 500 chars)" />

        <div>
          <label style={labelMuted}>Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={4}
            placeholder="Detailed course description"
            style={{ ...selectField, resize: 'vertical' }}
          />
        </div>

        <div className={styles.formRow}>
          <Input label="Price (₹)" type="number" value={form.price} onChange={set('price')} min="0" step="0.01" />
          <Input label="Discount Price (₹)" type="number" value={form.discount_price} onChange={set('discount_price')} min="0" step="0.01" placeholder="Optional" />
        </div>
        <p style={{ ...labelMuted, margin: '-0.5rem 0 0', fontSize: '0.8125rem', lineHeight: 1.45 }}>
          Checkout uses fixed plans for all paid courses: 1-year without diet ₹3,000, with diet ₹4,000. Price fields above are optional for internal reference.
        </p>

        <div className={styles.formRow}>
          <Input label="Duration (hours)" type="number" value={form.duration_hours} onChange={set('duration_hours')} min="0" step="0.1" placeholder="e.g., 10.5" />
          <Input label="Sort Order" type="number" value={form.sort_order} onChange={set('sort_order')} />
        </div>

        <div>
          <label style={labelMuted}>Thumbnail</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
            style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}
          />
        </div>

        <div className={styles.formRow}>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={form.is_published === '1'} onChange={(e) => setForm({ ...form, is_published: e.target.checked ? '1' : '0' })} />
            Published
          </label>
          <label style={checkboxLabel}>
            <input type="checkbox" checked={form.is_free === '1'} onChange={(e) => setForm({ ...form, is_free: e.target.checked ? '1' : '0' })} />
            Free Course
          </label>
        </div>
        <label style={{ ...checkboxLabel, marginTop: '0.5rem' }}>
          <input
            type="checkbox"
            checked={form.is_upcoming === '1'}
            onChange={(e) => setForm({ ...form, is_upcoming: e.target.checked ? '1' : '0' })}
          />
          Show under Upcoming on home (teaser + &quot;I&apos;m interested&quot;)
        </label>

        <div className={styles.formActions}>
          <Button variant="secondary" type="button" onClick={() => navigate('/admin/courses')}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{isEdit ? 'Update Course' : 'Create Course'}</Button>
        </div>
      </form>
    </div>
  );
}
