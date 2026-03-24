import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { HomePage } from '@/pages/Home/HomePage';
import { LoginPage } from '@/pages/Auth/LoginPage';
import { RegisterPage } from '@/pages/Auth/RegisterPage';
import { AdminLayout } from '@/pages/Admin/AdminLayout';
import { DashboardPage } from '@/pages/Admin/DashboardPage';
import { CategoriesPage } from '@/pages/Admin/CategoriesPage';
import { CoursesPage } from '@/pages/Admin/CoursesPage';
import { CourseFormPage } from '@/pages/Admin/CourseFormPage';
import { VideosPage } from '@/pages/Admin/VideosPage';
import { UsersPage } from '@/pages/Admin/UsersPage';
import { TransactionsPage } from '@/pages/Admin/TransactionsPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.HOME} element={<HomePage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route
        path={ROUTES.MY_LEARNING}
        element={
          <ProtectedRoute>
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>
              <h2>My Learning</h2>
              <p>Coming in Phase 4</p>
            </div>
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
          <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF' }}>
            <h2>404 — Page Not Found</h2>
          </div>
        }
      />
    </Routes>
  );
}
