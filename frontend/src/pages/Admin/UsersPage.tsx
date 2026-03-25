import { useState, useEffect, useCallback } from 'react';
import { getAdminUsers, updateUser } from '@/api/admin.api';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { Input } from '@/components/ui/Input/Input';
import { useToast } from '@/components/ui/Toast/ToastContext';
import type { PaginationMeta } from '@/types/api.types';
import type { User } from '@/types/auth.types';
import styles from './AdminPage.module.scss';

type UserWithCourses = User & { purchased_courses: Array<{ title: string; enrolled_at: string }> };

export function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserWithCourses[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, per_page: 12, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const result = await getAdminUsers({ page, search });
      setUsers(result.data);
      setMeta(result.meta);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleActive = async (user: UserWithCourses) => {
    try {
      await updateUser(user.id, { is_active: user.is_active ? 0 : 1 });
      showToast('success', `User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchData(meta.page);
    } catch {
      showToast('error', 'Failed to update user');
    }
  };

  const columns: Column<UserWithCourses>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'role', header: 'Role',
      render: (r) => (
        <span className={`badge ${r.role === 'admin' ? 'badge--primary' : 'badge--info'}`}>{r.role}</span>
      ),
    },
    {
      key: 'purchased_courses', header: 'Purchased Courses',
      render: (r) => (
        <div className={styles.coursesList}>
          {r.purchased_courses.length === 0
            ? <span>None</span>
            : r.purchased_courses.map((c, i) => <span key={i}>{c.title}</span>)
          }
        </div>
      ),
    },
    {
      key: 'is_active', header: 'Active',
      render: (r) => (
        <button className={styles.toggle} data-active={String(!!r.is_active)} onClick={() => toggleActive(r)} />
      ),
    },
    {
      key: 'created_at', header: 'Joined',
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h2>Users</h2>
      </div>

      <div className={styles.filters}>
        <Input placeholder="Search by name, email, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable columns={columns} data={users} loading={loading} keyExtractor={(r) => r.id} />
      <Pagination meta={meta} onPageChange={fetchData} />
    </div>
  );
}
