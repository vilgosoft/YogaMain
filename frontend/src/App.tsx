import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast/Toast';
import { ConnectionBanner } from '@/components/ui/ConnectionBanner/ConnectionBanner';
import { Navbar } from '@/components/layout/Navbar/Navbar';
import { Footer } from '@/components/layout/Footer/Footer';
import { AppRoutes } from '@/routes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConnectionBanner />
          <Navbar />
          <AppRoutes />
          <Footer />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
