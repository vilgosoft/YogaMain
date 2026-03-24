import { Routes, Route } from 'react-router-dom';
import { ROUTES } from '@/utils/constants';
import { ProtectedRoute } from './ProtectedRoute';
import { HomePage } from '@/pages/Home/HomePage';
import { LoginPage } from '@/pages/Auth/LoginPage';
import { RegisterPage } from '@/pages/Auth/RegisterPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.HOME} element={<HomePage />} />
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />

      {/* Protected Routes — added in later phases */}
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
