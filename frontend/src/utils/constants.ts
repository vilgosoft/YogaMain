/** Used in Privacy Policy & Terms — update registered office and jurisdiction with your counsel. */
export const SITE_LEGAL = {
  name: 'SAI ISHANI YOGASHALA',
  url: 'https://saiishaniyogashala.in',
  registeredOffice:
    'Your registered business address (update with your company / partnership / proprietor particulars as applicable).',
  jurisdiction: 'Tamil Nadu, India (update city and state as advised by legal counsel).',
} as const;

/** Shown at top of legal pages; change when you revise the documents. */
export const LEGAL_LAST_UPDATED = 'March 28, 2026';

export const ROUTES = {
  HOME: '/',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS: '/terms',
  SHIPPING_REFUND_POLICY: '/shipping-refund-policy',
  CONTACT: '/contact',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:slug',
  MY_LEARNING: '/my-learning',
  PLAYER: '/player/:courseId/:videoId',
  PAYMENT_CALLBACK: '/payments/callback',
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_COURSES: '/admin/courses',
  ADMIN_COURSE_NEW: '/admin/courses/new',
  ADMIN_COURSE_EDIT: '/admin/courses/:id/edit',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_VIDEOS: '/admin/videos/:courseId',
  ADMIN_USERS: '/admin/users',
  ADMIN_TRANSACTIONS: '/admin/transactions',
} as const;
