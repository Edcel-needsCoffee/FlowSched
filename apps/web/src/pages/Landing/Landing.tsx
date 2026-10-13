import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Nav } from '../../components/landing/Nav';
import { Hero } from '../../components/landing/Hero';
import { StatStrip } from '../../components/landing/StatStrip';
import { Features } from '../../components/landing/Features';
import { Roles } from '../../components/landing/Roles';
import { CtaSection } from '../../components/landing/CtaSection';
import { Footer } from '../../components/landing/Footer';
import { useAuthStore } from '../../store/auth.store';
import { useUiStore } from '../../store/ui.store';

/**
 * Public landing page at `/`. Authenticated sessions skip it and go
 * straight to `/dashboard`.
 */
export function Landing({ openLoginOnMount = false }: { openLoginOnMount?: boolean }): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const openLoginModal = useUiStore((s) => s.openLoginModal);

  useEffect(() => {
    if (openLoginOnMount) {
      openLoginModal();
    }
  }, [openLoginOnMount, openLoginModal]);

  if (isAuthenticated) {
    // Mirror the login landing: faculty sessions resume on their own
    // workload, management on the department dashboard.
    return <Navigate to={role === 'FACULTY' ? '/workload' : '/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-navy-950 font-body text-ink-100 antialiased">
      <Nav />
      <main>
        <Hero />
        <StatStrip />
        <Features />
        <Roles />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
