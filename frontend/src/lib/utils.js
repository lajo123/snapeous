import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ── Color maps (no translation needed) ──────────────────────────────

export const CATEGORY_COLORS = {
  blog_comments: 'bg-blue-100 text-blue-800',
  forums: 'bg-purple-100 text-purple-800',
  directories: 'bg-green-100 text-green-800',
  guestbooks: 'bg-yellow-100 text-yellow-800',
  profiles: 'bg-pink-100 text-pink-800',
  social: 'bg-indigo-100 text-indigo-800',
  authority: 'bg-red-100 text-red-800',
  serp_exploration: 'bg-orange-100 text-orange-800',
  files: 'bg-gray-100 text-gray-800',
  guest_posts: 'bg-teal-100 text-teal-800',
  wikis: 'bg-cyan-100 text-cyan-800',
  ereputation: 'bg-amber-100 text-amber-800',
  web20: 'bg-brand-100 text-brand-800',
};

export const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
};

export const SPOT_STATUS_COLORS = {
  discovered: 'bg-gray-100 text-gray-800',
  qualified: 'bg-blue-100 text-blue-800',
  selected: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  link_posted: 'bg-brand-100 text-brand-800',
  failed: 'bg-red-100 text-red-800',
};

export const SEARCH_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800 animate-pulse',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function truncateUrl(url, maxLength = 50) {
  if (!url) return '';
  const clean = url.replace(/^https?:\/\//, '');
  return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
}

export function formatDate(dateStr, locale = 'en-US') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Backlinks ─────────────────────────────────────────────────────────

export const BACKLINK_STATUS_COLORS = {
  active: 'bg-brand-100 text-brand-800',
  lost: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
};

export const BACKLINK_LINK_TYPE_COLORS = {
  dofollow: 'bg-green-100 text-green-800',
  nofollow: 'bg-gray-100 text-gray-800',
};

export function getHttpStatusColor(code) {
  if (!code) return 'bg-gray-100 text-gray-800';
  if (code >= 200 && code < 300) return 'bg-brand-100 text-brand-800';
  if (code >= 300 && code < 400) return 'bg-blue-100 text-blue-800';
  if (code === 404) return 'bg-red-100 text-red-800';
  if (code >= 400) return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-800';
}

export function getIndexationStatusColor(isIndexed) {
  if (isIndexed === true) return 'bg-brand-100 text-brand-800';
  if (isIndexed === false) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}
