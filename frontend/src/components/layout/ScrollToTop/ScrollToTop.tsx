import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to top on route change (React Router does not do this by default). */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search, hash]);

  return null;
}
