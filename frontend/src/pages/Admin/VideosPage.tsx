import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import { getCourseVideos, uploadVideo, updateVideo, deleteVideo } from '@/api/admin.api';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
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
  const [videoUrl, setVideoUrl] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    is_preview: '0',
    duration_sec: '',
  });

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
    const url = videoUrl.trim();
    if (!form.title.trim()) {
      showToast('error', 'Title is required');
      return;
    }
    if (!url) {
      showToast('error', 'Paste your Google Drive video link');
      return;
    }
    if (!url.includes('drive.google.com')) {
      showToast('error', 'Use a Google Drive share link (drive.google.com)');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('course_id', courseId!);
      formData.append('title', form.title.trim());
      formData.append('description', form.description);
      formData.append('is_preview', form.is_preview);
      formData.append('video_url', url);
      if (form.duration_sec.trim() !== '') {
        formData.append('duration_sec', form.duration_sec.trim());
      }

      await uploadVideo(formData);
      showToast('success', 'Video added');
      setModalOpen(false);
      setForm({ title: '', description: '', is_preview: '0', duration_sec: '' });
      setVideoUrl('');
      fetchData();
    } catch {
      showToast('error', 'Could not save video. Check the Drive link and try again.');
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
      <Link to="/admin/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
        <HiOutlineArrowLeft /> Back to Courses
      </Link>

      <div className={styles.header}>
        <h2>{course?.title ?? 'Course'} — Videos</h2>
        <Button onClick={() => setModalOpen(true)}>Upload Video</Button>
      </div>

      <DataTable columns={columns} data={videos} loading={loading} keyExtractor={(r) => r.id} emptyMessage="No videos yet. Upload your first video." />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add video (Google Drive)">
        <div className={styles.form}>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          <Input
            label="Google Drive video link"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/.../view"
            type="url"
            autoComplete="off"
          />
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '-0.25rem 0 0', lineHeight: 1.45 }}>
            In Google Drive: right-click the video → Share → “Anyone with the link” can view → copy link.
          </p>
          <Input
            label="Duration (seconds, optional)"
            value={form.duration_sec}
            onChange={(e) => setForm({ ...form, duration_sec: e.target.value })}
            placeholder="e.g. 600 for progress estimate"
            type="number"
            min={0}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.is_preview === '1'} onChange={(e) => setForm({ ...form, is_preview: e.target.checked ? '1' : '0' })} />
            Free Preview
          </label>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} isLoading={saving}>Add video</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
