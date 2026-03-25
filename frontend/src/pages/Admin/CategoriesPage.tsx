import { useState, useEffect, useCallback } from 'react';
import { HiPlus } from 'react-icons/hi2';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/admin.api';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { useToast } from '@/components/ui/Toast/Toast';
import type { Category } from '@/types/course.types';
import styles from './AdminPage.module.scss';

export function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<(Category & { course_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', sort_order: '0', is_active: '1' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', description: '', sort_order: '0', is_active: '1' });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      sort_order: String(cat.sort_order),
      is_active: String(cat.is_active ? 1 : 0),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description: form.description || null,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: parseInt(form.is_active),
      };

      if (editing) {
        await updateCategory(editing.id, payload);
        showToast('success', 'Category updated');
      } else {
        await createCategory(payload);
        showToast('success', 'Category created');
      }

      setModalOpen(false);
      fetchData();
    } catch {
      showToast('error', 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      showToast('success', 'Category deleted');
      fetchData();
    } catch {
      showToast('error', 'Cannot delete — category has courses');
    }
  };

  const columns: Column<Category & { course_count?: number }>[] = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    { key: 'course_count', header: 'Courses', render: (r) => String(r.course_count ?? 0) },
    { key: 'sort_order', header: 'Order' },
    {
      key: 'is_active', header: 'Status',
      render: (r) => (
        <span className={`badge ${r.is_active ? 'badge--success' : 'badge--error'}`}>
          {r.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      render: (r) => (
        <div className={styles.actions}>
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h2>Categories</h2>
        <Button icon={<HiPlus />} onClick={openCreate}>Add Category</Button>
      </div>

      <DataTable columns={columns} data={categories} loading={loading} keyExtractor={(r) => r.id} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <div className={styles.form}>
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Beginner Yoga" />
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g., beginner-yoga" />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
          <Input label="Sort Order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
