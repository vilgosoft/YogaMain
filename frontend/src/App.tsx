import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AntConfigProvider } from '@/components/AntConfigProvider';
import { ToastProvider } from '@/components/ui/Toast/Toast';
import { Navbar } from '@/components/layout/Navbar/Navbar';
import { Footer } from '@/components/layout/Footer/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav/MobileBottomNav';
import { AppRoutes } from '@/routes';

function AppShell() {
  const { pathname } = useLocation();
  const hideFooter =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/player') ||
    pathname.startsWith('/my-learning') ||
    pathname === '/payments/callback';
  const showFooter = !hideFooter;

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
        <AntConfigProvider>
          <AuthProvider>
            <ToastProvider>
              <AppShell />
            </ToastProvider>
          </AuthProvider>
        </AntConfigProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
