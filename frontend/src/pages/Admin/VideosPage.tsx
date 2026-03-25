import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import { getCourseVideos, uploadVideo, updateVideo, deleteVideo } from '@/api/admin.api';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/ToastContext';
import type { Video, Course } from '@/types/course.types';
import styles from './AdminPage.module.scss';

export function VideosPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { showToast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: '', description: '', is_preview: '0' });

  const fetchData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await getCourseVideos(Number(courseId));
      setCourse(data.course);
      setVideos(data.videos);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpload = async () => {
    if (!videoFile || !form.title) {
      showToast('error', 'Title and video file are required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('course_id', courseId!);
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('is_preview', form.is_preview);
      formData.append('video', videoFile);

      await uploadVideo(formData);
      showToast('success', 'Video uploaded');
      setModalOpen(false);
      setForm({ title: '', description: '', is_preview: '0' });
      setVideoFile(null);
      fetchData();
    } catch {
      showToast('error', 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (video: Video) => {
    if (!confirm(`Delete "${video.title}"?`)) return;
    try {
      await deleteVideo(video.id);
      showToast('success', 'Video deleted');
      fetchData();
    } catch {
      showToast('error', 'Failed to delete');
    }
  };

  const togglePreview = async (video: Video) => {
    try {
      await updateVideo(video.id, { is_preview: video.is_preview ? 0 : 1 } as unknown as Partial<Video>);
      fetchData();
    } catch {
      showToast('error', 'Failed to update');
    }
  };

  const formatDuration = (sec: number | null) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size="lg" /></div>;

  const columns: Column<Video>[] = [
    { key: 'sort_order', header: '#', render: (r) => String(r.sort_order) },
    { key: 'title', header: 'Title' },
    { key: 'duration_sec', header: 'Duration', render: (r) => formatDuration(r.duration_sec) },
    {
      key: 'is_preview', header: 'Preview',
      render: (r) => (
        <button className={styles.toggle} data-active={String(!!r.is_preview)} onClick={() => togglePreview(r)} />
      ),
    },
    {
      key: 'transcode_status', header: 'Transcode',
      render: (r) => (
        <span className={`${styles.statusBadge} ${styles[`statusBadge--${r.transcode_status}`]}`}>
          {r.transcode_status}
        </span>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      render: (r) => (
        <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}>Delete</Button>
      ),
    },
  ];

  return (
    <div>
      <Link to="/admin/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#9CA3AF', marginBottom: '1rem', fontSize: '0.875rem' }}>
        <HiOutlineArrowLeft /> Back to Courses
      </Link>

      <div className={styles.header}>
        <h2>{course?.title ?? 'Course'} — Videos</h2>
        <Button onClick={() => setModalOpen(true)}>Upload Video</Button>
      </div>

      <DataTable columns={columns} data={videos} loading={loading} keyExtractor={(r) => r.id} emptyMessage="No videos yet. Upload your first video." />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Upload Video">
        <div className={styles.form}>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>Video File</label>
            <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} style={{ color: '#9CA3AF' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#C4C7D4', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.is_preview === '1'} onChange={(e) => setForm({ ...form, is_preview: e.target.checked ? '1' : '0' })} />
            Free Preview
          </label>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} isLoading={saving}>Upload</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
