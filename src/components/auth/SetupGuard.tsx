import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSystemSetup } from '@/hooks/useSystemSetup';

interface SetupGuardProps {
  children: React.ReactNode;
}

export function SetupGuard({ children }: SetupGuardProps) {
  const { isSetupComplete, isLoading } = useSystemSetup();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect if still loading
    if (isLoading) {
      return;
    }

    // If on setup page and setup is complete, redirect to login
    if (location.pathname === '/setup' && isSetupComplete) {
      navigate('/login', { replace: true });
      return;
    }

    // If setup is not complete and not on setup page, redirect to setup
    if (!isSetupComplete && location.pathname !== '/setup') {
      navigate('/setup', { replace: true });
    }
  }, [isSetupComplete, isLoading, location.pathname, navigate]);

  // Show loading while checking or while redirecting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // If setup complete and on setup page, show loading while redirect happens
  if (isSetupComplete && location.pathname === '/setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Setup already complete. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If not set up and not on setup page, show loading while redirect happens
  if (!isSetupComplete && location.pathname !== '/setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
