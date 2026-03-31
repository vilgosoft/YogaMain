import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast/Toast';
import { Navbar } from '@/components/layout/Navbar/Navbar';
import { Footer } from '@/components/layout/Footer/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav/MobileBottomNav';
import { AppRoutes } from '@/routes';

function AppShell() {
  const { pathname } = useLocation();
  const showFooter = pathname === '/';

  return (
    <>
      <Navbar />
      <AppRoutes />
      <MobileBottomNav />
      {showFooter ? <Footer /> : null}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
