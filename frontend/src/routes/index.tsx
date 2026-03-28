import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { HomePage } from '@/pages/Home/HomePage';
import { LoginPage } from '@/pages/Auth/LoginPage';
import { RegisterPage } from '@/pages/Auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/Auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/Auth/ResetPasswordPage';
import { CatalogPage } from '@/pages/Catalog/CatalogPage';
import { CourseDetailPage } from '@/pages/Catalog/CourseDetailPage';
import { MyLearningPage } from '@/pages/MyLearning/MyLearningPage';
import { PaymentCallbackPage } from '@/pages/Payments/PaymentCallbackPage';
import { AdminLayout } from '@/pages/Admin/AdminLayout';
import { DashboardPage } from '@/pages/Admin/DashboardPage';
import { CategoriesPage } from '@/pages/Admin/CategoriesPage';
import { CoursesPage } from '@/pages/Admin/CoursesPage';
import { CourseFormPage } from '@/pages/Admin/CourseFormPage';
import { VideosPage } from '@/pages/Admin/VideosPage';
import { UsersPage } from '@/pages/Admin/UsersPage';
import { TransactionsPage } from '@/pages/Admin/TransactionsPage';
import { PlayerPage } from '@/pages/Player/PlayerPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.HOME} element={<HomePage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      <Route path={ROUTES.COURSES} element={<CatalogPage />} />
      <Route path={ROUTES.COURSE_DETAIL} element={<CourseDetailPage />} />
      <Route path={ROUTES.PAYMENT_CALLBACK} element={<PaymentCallbackPage />} />

      {/* Protected Routes */}
      <Route
        path={ROUTES.PLAYER}
        element={
          <ProtectedRoute>
            <PlayerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.MY_LEARNING}
        element={
          <ProtectedRoute>
            <MyLearningPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path={ROUTES.ADMIN}
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/new" element={<CourseFormPage />} />
        <Route path="courses/:id/edit" element={<CourseFormPage />} />
        <Route path="videos/:courseId" element={<VideosPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
      </Route>

      {/* Catch-all */}
      <Route
        path="*"
        element={
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <h2 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>404 — Page Not Found</h2>
          </div>
        }
      />
    </Routes>
  );
}
