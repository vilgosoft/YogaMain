export function formatPrice(price: number, discountPrice?: number | null): string {
  if (price === 0) return 'Free';
  const effective = discountPrice != null && discountPrice > 0 ? discountPrice : price;
  return `₹${effective.toLocaleString('en-IN')}`;
}

export function formatOriginalPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

export function formatDuration(hours: number | null | undefined): string {
  if (!hours) return '';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatVideoTime(seconds: number | null): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Sum of lesson lengths for course sidebar (e.g. "2h 15m"). */
export function formatTotalDurationSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
