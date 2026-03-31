import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import { getCourseVideos, uploadVideo, updateVideo, deleteVideo, type AdminVideoUpdatePayload } from '@/api/admin.api';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/components/ui/Toast/Toast';
import type { Video, Course } from '@/types/course.types';
import styles from './AdminPage.module.scss';

function formatDurationMinSec(sec: number | null): string {
  if (sec == null || sec < 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s} sec`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} sec`;
}

/** Empty both → null (clear / omit). Invalid seconds (>59) → 'invalid'. */
function totalSecondsFromParts(minStr: string, secStr: string): number | null | 'invalid' {
  const mT = minStr.trim();
  const sT = secStr.trim();
  if (mT === '' && sT === '') return null;
  const min = mT === '' ? 0 : Number(mT);
  const sec = sT === '' ? 0 : Number(sT);
  if (!Number.isInteger(min) || min < 0) return 'invalid';
  if (!Number.isInteger(sec) || sec < 0 || sec > 59) return 'invalid';
  return min * 60 + sec;
}

export function VideosPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { showToast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [saving, setSaving] = useState(false);

  const [videoUrl, setVideoUrl] = useState('');
  const [captionsUrl, setCaptionsUrl] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    is_preview: '0',
    durationMin: '',
    durationSec: '',
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    captionsUrl: '',
    durationMin: '',
    durationSec: '',
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetAddForm = () => {
    setForm({ title: '', description: '', is_preview: '0', durationMin: '', durationSec: '' });
    setVideoUrl('');
    setCaptionsUrl('');
  };

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

    const totalSec = totalSecondsFromParts(form.durationMin, form.durationSec);
    if (totalSec === 'invalid') {
      showToast('error', 'Duration: use minutes (0+) and seconds (0–59), or leave both empty');
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
      if (totalSec !== null) {
        formData.append('duration_sec', String(totalSec));
      }
      if (captionsUrl.trim() !== '') {
        formData.append('captions_url', captionsUrl.trim());
      }

      await uploadVideo(formData);
      showToast('success', 'Video added');
      setModalOpen(false);
      resetAddForm();
      fetchData();
    } catch {
      showToast('error', 'Could not save video. Check the Drive link and try again.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (video: Video) => {
    setEditingVideo(video);
    const sec = video.duration_sec;
    const orig = video.original_file ?? '';
    const driveUrl = orig.includes('drive.google.com') ? orig : '';
    setEditForm({
      title: video.title,
      description: video.description ?? '',
      videoUrl: driveUrl,
      captionsUrl: video.captions_url ?? '',
      durationMin: sec != null ? String(Math.floor(sec / 60)) : '',
      durationSec: sec != null ? String(sec % 60) : '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;
    if (!editForm.title.trim()) {
      showToast('error', 'Title is required');
      return;
    }

    const totalSec = totalSecondsFromParts(editForm.durationMin, editForm.durationSec);
    if (totalSec === 'invalid') {
      showToast('error', 'Duration: use minutes (0+) and seconds (0–59), or leave both empty');
      return;
    }

    const url = editForm.videoUrl.trim();
    if (url && !url.includes('drive.google.com')) {
      showToast('error', 'Drive URL must be a Google Drive link');
      return;
    }

    const payload: AdminVideoUpdatePayload = {
      title: editForm.title.trim(),
      description: editForm.description.trim() === '' ? null : editForm.description.trim(),
      duration_sec: totalSec,
    };

    if (url) {
      payload.video_url = url;
    }
    payload.captions_url = editForm.captionsUrl.trim() === '' ? null : editForm.captionsUrl.trim();

    setSaving(true);
    try {
      await updateVideo(editingVideo.id, payload);
      showToast('success', 'Video updated');
      setEditModalOpen(false);
      setEditingVideo(null);
      fetchData();
    } catch {
      showToast('error', 'Could not update video');
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
      await updateVideo(video.id, { is_preview: video.is_preview ? 0 : 1 });
      fetchData();
    } catch {
      showToast('error', 'Failed to update');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const columns: Column<Video>[] = [
    { key: 'sort_order', header: '#', render: (r) => String(r.sort_order) },
    { key: 'title', header: 'Title' },
    { key: 'duration_sec', header: 'Duration', render: (r) => formatDurationMinSec(r.duration_sec) },
    {
      key: 'is_preview',
      header: 'Preview',
      render: (r) => (
        <button className={styles.toggle} data-active={String(!!r.is_preview)} onClick={() => togglePreview(r)} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Link
        to="/admin/courses"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--color-text-muted)',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}
      >
        <HiOutlineArrowLeft /> Back to Courses
      </Link>

      <div className={styles.header}>
        <h2>{course?.title ?? 'Course'} — Videos</h2>
        <Button
          onClick={() => {
            resetAddForm();
            setModalOpen(true);
          }}
        >
          Upload Video
        </Button>
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
            label="Captions file (WebVTT, optional)"
            value={captionsUrl}
            onChange={(e) => setCaptionsUrl(e.target.value)}
            placeholder="https://…/en.vtt or /uploads/captions/lesson.vtt"
            type="url"
            autoComplete="off"
          />
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '-0.25rem 0 0', lineHeight: 1.45 }}>
            Only used for self-hosted MP4 playback. Drive embeds use captions added inside Google Drive (see player note).
          </p>
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
              }}
            >
              Duration (optional)
            </span>
            <div className={styles.formRow}>
              <Input
                label="Minutes"
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                placeholder="0"
                type="number"
                min={0}
              />
              <Input
                label="Seconds"
                value={form.durationSec}
                onChange={(e) => setForm({ ...form, durationSec: e.target.value })}
                placeholder="0–59"
                type="number"
                min={0}
                max={59}
              />
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Seconds must be 0–59. Leave both empty if unknown.
            </p>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            <input
              type="checkbox"
              checked={form.is_preview === '1'}
              onChange={(e) => setForm({ ...form, is_preview: e.target.checked ? '1' : '0' })}
            />
            Free Preview
          </label>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} isLoading={saving}>
              Add video
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingVideo(null);
        }}
        title="Edit video"
      >
        <div className={styles.form}>
          <Input
            label="Title"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            placeholder="Optional"
          />
          <Input
            label="Google Drive video link"
            value={editForm.videoUrl}
            onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
            placeholder="https://drive.google.com/file/d/.../view"
            type="url"
            autoComplete="off"
          />
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '-0.25rem 0 0', lineHeight: 1.45 }}>
            Leave unchanged to keep the current video source. Paste a new link only to replace it (Google Drive only).
          </p>
          <Input
            label="Captions (WebVTT URL or path, optional)"
            value={editForm.captionsUrl}
            onChange={(e) => setEditForm({ ...editForm, captionsUrl: e.target.value })}
            placeholder="https://…/en.vtt or /uploads/captions/lesson.vtt"
            type="url"
            autoComplete="off"
          />
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '-0.25rem 0 0', lineHeight: 1.45 }}>
            Clear the field and save to remove. For Drive videos, captions still come from Google unless you use MP4 + VTT.
          </p>
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
              }}
            >
              Duration
            </span>
            <div className={styles.formRow}>
              <Input
                label="Minutes"
                value={editForm.durationMin}
                onChange={(e) => setEditForm({ ...editForm, durationMin: e.target.value })}
                placeholder="0"
                type="number"
                min={0}
              />
              <Input
                label="Seconds"
                value={editForm.durationSec}
                onChange={(e) => setEditForm({ ...editForm, durationSec: e.target.value })}
                placeholder="0–59"
                type="number"
                min={0}
                max={59}
              />
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Clear both fields to remove stored duration. Seconds: 0–59.
            </p>
          </div>
          <div className={styles.formActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setEditModalOpen(false);
                setEditingVideo(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSaveEdit()} isLoading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
