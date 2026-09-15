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
  const openLoginModal = useUiStore((s) => s.openLoginModal);

  useEffect(() => {
    if (openLoginOnMount) {
      openLoginModal();
    }
  }, [openLoginOnMount, openLoginModal]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white font-sans text-ink antialiased">
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
