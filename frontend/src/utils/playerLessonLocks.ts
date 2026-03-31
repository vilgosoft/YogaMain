import type { PlayerLesson } from '@/api/courses.api';

/** After local progress updates, re-derive sequential locks (previous lesson must be marked complete). */
export function recomputeLessonLocks(lessons: PlayerLesson[]): PlayerLesson[] {
  let prevComplete = true;
  return lessons.map((l) => {
    const is_locked = !prevComplete;
    prevComplete = l.is_completed === true;
    return { ...l, is_locked };
  });
}
