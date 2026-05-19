import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, Plus, Sparkles, Clock } from 'lucide-react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useAppIdentity } from '@/hooks/useSystemConfig';
import appLogo from '@/assets/logo.png';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/locator', label: 'Coverage Map' },
  { href: '/favorites', label: 'Saved' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

// Calculate remaining trial days
const getTrialDaysRemaining = (trialEnd: string | null): number | null => {
  if (!trialEnd) return null;
  const now = new Date();
  const endDate = new Date(trialEnd);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { subscription } = useSubscription();
  const { appName, primaryColor } = useAppIdentity();
  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isTrialing = subscription?.status === 'trialing';
  const trialDaysRemaining = isTrialing ? getTrialDaysRemaining(subscription?.trial_end ?? null) : null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img 
              src={appLogo} 
              alt={appName} 
              className="h-9 w-9 rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
            />
            <span className="text-xl font-bold text-foreground">
              {appName.includes('Pro') ? (
                <>{appName.replace('Pro', '')}<span className="text-gradient" style={{ color: primaryColor }}>Pro</span></>
              ) : (
                <span style={{ color: primaryColor }}>{appName}</span>
              )}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive(link.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <ThemeSwitcher />
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="relative">
                    <User className="h-4 w-4 mr-2" />
                    {user?.name}
                    {isTrialing && trialDaysRemaining !== null && (
                      <span className="ml-2 bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {trialDaysRemaining}d left
                      </span>
                    )}
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register-store">
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-sm relative">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Store Zone
                    {!hasActiveSubscription && (
                      <span className="absolute -top-1.5 -right-1.5 bg-warning text-warning-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                        <Sparkles className="h-2.5 w-2.5" />
                        PRO
                      </span>
                    )}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Theme Switcher & Menu Button */}
          <div className="lg:hidden flex items-center gap-1">
            <ThemeSwitcher />
            <button
              className="p-2 rounded-lg hover:bg-muted"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border bg-card"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border pt-4 mt-2 flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-center">
                        Dashboard
                        {isTrialing && trialDaysRemaining !== null && (
                          <span className="ml-2 bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {trialDaysRemaining}d left
                          </span>
                        )}
                      </Button>
                    </Link>
                    <Button variant="ghost" className="w-full" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register-store" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-sm relative">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Store Zone
                        {!hasActiveSubscription && (
                          <span className="ml-2 bg-warning text-warning-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" />
                            PRO
                          </span>
                        )}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}