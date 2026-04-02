import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAdminUsers,
  updateUser,
  deleteAdminUser,
  getEnrollmentCourseOptions,
  setUserEnrollments,
  type PurchasedCourseRow,
  type EnrollmentCourseOption,
} from '@/api/admin.api';
import { HiOutlineTrash } from 'react-icons/hi2';
import { useAuth } from '@/hooks/useAuth';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { Modal } from '@/components/ui/Modal/Modal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import { isValidEmail, isValidPhone } from '@/utils/validators';
import { getApiErrorMessage } from '@/utils/apiErrors';
import type { PaginationMeta } from '@/types/api.types';
import type { User } from '@/types/auth.types';
import adminStyles from './AdminPage.module.scss';
import styles from './UsersPage.module.scss';

type UserWithCourses = User & { purchased_courses: PurchasedCourseRow[] };

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserWithCourses[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, per_page: 12, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [editUser, setEditUser] = useState<UserWithCourses | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user' as 'user' | 'admin',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [courseOptions, setCourseOptions] = useState<EnrollmentCourseOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(new Set());
  const [savingEdit, setSavingEdit] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithCourses | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const editModalLoadSeq = useRef(0);

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEditModal = (user: UserWithCourses) => {
    const seq = ++editModalLoadSeq.current;
    setEditUser(user);
    setCourseOptions([]);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
    setFormErrors({});
    setSelectedCourseIds(new Set(user.purchased_courses.map((c) => c.course_id)));
    setLoadingOptions(true);
    getEnrollmentCourseOptions()
      .then((data) => {
        if (seq !== editModalLoadSeq.current) return;
        setCourseOptions(data);
      })
      .catch(() => {
        if (seq !== editModalLoadSeq.current) return;
        showToast('error', 'Could not load courses');
        setEditUser(null);
      })
      .finally(() => {
        if (seq === editModalLoadSeq.current) {
          setLoadingOptions(false);
        }
      });
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setEditUser(null);
    setCourseOptions([]);
    setSelectedCourseIds(new Set());
    setFormErrors({});
  };

  const setCourseSelected = (courseId: number, selected: boolean) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(courseId);
      } else {
        next.delete(courseId);
      }
      return next;
    });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setFormErrors({});

    const name = editForm.name.trim();
    const email = editForm.email.trim().toLowerCase();
    const phone = editForm.phone.replace(/\D/g, '');

    const localErrs: Record<string, string> = {};
    if (name.length < 2) localErrs.name = 'Name must be at least 2 characters';
    if (!email) localErrs.email = 'Email is required';
    else if (!isValidEmail(email)) localErrs.email = 'Invalid email address';
    if (!phone) localErrs.phone = 'Phone is required';
    else if (!isValidPhone(phone)) localErrs.phone = 'Enter a valid 10-digit Indian mobile number';

    if (Object.keys(localErrs).length > 0) {
      setFormErrors(localErrs);
      showToast('error', 'Please fix the highlighted fields');
      return;
    }

    setSavingEdit(true);
    try {
      const userResp = await updateUser(editUser.id, {
        name,
        email,
        phone,
        role: editForm.role,
      });

      try {
        const { purchased_courses } = await setUserEnrollments(editUser.id, Array.from(selectedCourseIds));
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editUser.id ? { ...u, ...userResp, purchased_courses } : u
          )
        );
        showToast('success', 'User and course access updated');
      } catch (enrollErr) {
        showToast(
          'error',
          getApiErrorMessage(enrollErr, 'Profile saved, but course access could not be updated.')
        );
        await fetchData(meta.page);
      }

      setEditUser(null);
      setCourseOptions([]);
      setSelectedCourseIds(new Set());
      setFormErrors({});
    } catch (err) {
      const fields = (err as { response?: { data?: { error?: { fields?: Record<string, string> } } } })
        ?.response?.data?.error?.fields;
      if (fields && typeof fields === 'object') {
        setFormErrors(fields);
      }
      showToast('error', getApiErrorMessage(err, 'Could not save user'));
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (user: UserWithCourses) => {
    try {
      await updateUser(user.id, { is_active: user.is_active ? 0 : 1 });
      showToast('success', `User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchData(meta.page);
    } catch {
      showToast('error', 'Failed to update user');
    }
  };

  const closeDeleteModal = () => {
    if (deletingUser) return;
    setUserToDelete(null);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      await deleteAdminUser(userToDelete.id);
      showToast('success', 'User deleted');
      if (editUser?.id === userToDelete.id) {
        setEditUser(null);
        setCourseOptions([]);
        setSelectedCourseIds(new Set());
        setFormErrors({});
      }
      setUserToDelete(null);
      await fetchData(meta.page);
    } catch (err) {
      showToast('error', getApiErrorMessage(err, 'Could not delete user'));
    } finally {
      setDeletingUser(false);
    }
  };

  const columns: Column<UserWithCourses>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'role',
      header: 'Role',
      render: (r) => (
        <span className={`badge ${r.role === 'admin' ? 'badge--primary' : 'badge--info'}`}>{r.role}</span>
      ),
    },
    {
      key: 'purchased_courses',
      header: 'Purchased courses',
      render: (r) => (
        <div className={styles.courseCell}>
          {r.purchased_courses.length === 0 ? (
            <span className={styles.noCourses}>None</span>
          ) : (
            <>
              <span className={styles.courseCount}>
                {r.purchased_courses.length} course{r.purchased_courses.length === 1 ? '' : 's'}
              </span>
              <div className={styles.chipWrap}>
                {r.purchased_courses.map((c) => (
                  <span key={c.course_id} className={styles.courseChip} title={c.title}>
                    {c.title}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Active',
      render: (r) => (
        <button
          className={adminStyles.toggle}
          data-active={String(!!r.is_active)}
          onClick={() => toggleActive(r)}
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => {
        const isSelf = currentUser != null && r.id === currentUser.id;
        return (
          <div className={styles.actionCell}>
            <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(r)}>
              Edit user
            </Button>
            <button
              type="button"
              className={styles.iconDelete}
              aria-label={`Delete user ${r.name}`}
              title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
              disabled={isSelf}
              onClick={() => setUserToDelete(r)}
            >
              <HiOutlineTrash aria-hidden />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className={adminStyles.header}>
        <h2>Users</h2>
      </div>

      <div className={adminStyles.filters}>
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable columns={columns} data={users} loading={loading} keyExtractor={(r) => r.id} />
      <Pagination meta={meta} onPageChange={fetchData} />

      <Modal
        isOpen={!!editUser}
        onClose={closeEditModal}
        title={editUser ? `Edit user — ${editUser.name}` : 'Edit user'}
        size="lg"
      >
        {editUser ? (
          <>
            <h4 className={styles.sectionTitle}>Profile</h4>
            <div className={styles.formGrid}>
              <Input
                label="Full name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                error={formErrors.name}
              />
              <Input
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                error={formErrors.email}
              />
              <Input
                label="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                error={formErrors.phone}
              />
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="edit-user-role">
                  Role
                </label>
                <select
                  id="edit-user-role"
                  className={styles.roleSelect}
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role: e.target.value as 'user' | 'admin' }))
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <h4 className={styles.sectionTitle}>Course access</h4>
            <p className={styles.enrollmentHint}>
              Checked courses are active for this user. Uncheck to <strong>remove access</strong> (their
              watch progress for that course is cleared). You can assign several courses; scroll the list
              if there are many.
            </p>
            {loadingOptions ? (
              <div className={styles.optionsLoading}>
                <Spinner />
              </div>
            ) : (
              <div className={styles.enrollmentList} role="list">
                {courseOptions.length === 0 ? (
                  <p className={styles.enrollmentHint}>
                    No courses in the catalog yet. Create a course first.
                  </p>
                ) : null}
                {courseOptions.map((c) => {
                  const checked = selectedCourseIds.has(c.id);
                  const rowId = `enroll-course-${c.id}`;
                  return (
                    <label key={c.id} htmlFor={rowId} className={styles.enrollmentRow}>
                      <input
                        id={rowId}
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setCourseSelected(c.id, e.target.checked)}
                      />
                      <div className={styles.enrollmentRowBody}>
                        <div className={styles.enrollmentTitle}>{c.title}</div>
                        <div className={styles.enrollmentMeta}>
                          {!c.is_published && <span>Draft · </span>}
                          {c.is_free ? 'Free' : 'Paid'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className={styles.modalActions}>
              <Button type="button" variant="outline" onClick={closeEditModal} disabled={savingEdit}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={saveEdit} isLoading={savingEdit}>
                Save changes
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        isOpen={!!userToDelete}
        onClose={closeDeleteModal}
        title="Delete user?"
        size="sm"
      >
        {userToDelete ? (
          <>
            <p className={styles.deleteWarning}>
              Permanently remove{' '}
              <span className={styles.deleteUserName}>{userToDelete.name}</span> ({userToDelete.email})?
              This cannot be undone. Their payment records in this system will be removed; course progress
              and enrollments are cleared with the account.
            </p>
            <div className={styles.modalActions}>
              <Button type="button" variant="outline" onClick={closeDeleteModal} disabled={deletingUser}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                className={styles.dangerBtn}
                onClick={confirmDeleteUser}
                isLoading={deletingUser}
              >
                Delete user
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
