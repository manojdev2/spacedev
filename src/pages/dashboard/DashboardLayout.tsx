import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Settings, BarChart3,
  Users, LogOut, Menu, X, ChevronLeft, Bell, UserCircle, ClipboardList, Flag, MessageSquare, Code, CalendarCheck, Layers, MapPin, Truck, Route, Car
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';
import { usePayPalCapture } from '@/hooks/usePayPalCapture';
import { useCryptoCapture } from '@/hooks/useCryptoCapture';
import appLogo from '@/assets/logo.png';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', adminOnly: false },
  { icon: Layers, label: 'Store Zones', href: '/dashboard/store-zones', adminOnly: false },
  { icon: MapPin, label: 'Locations', href: '/dashboard/locations', adminOnly: false },
  { icon: CalendarCheck, label: 'Appointments', href: '/dashboard/appointments', adminOnly: false },
  { icon: ClipboardList, label: 'Submissions', href: '/dashboard/submissions', adminOnly: true },
  { icon: Flag, label: 'Reported Reviews', href: '/dashboard/reported-reviews', adminOnly: true },
  { icon: MessageSquare, label: 'Contact Messages', href: '/dashboard/contact-messages', adminOnly: true },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', adminOnly: false },
  { icon: Code, label: 'Widget', href: '/dashboard/widget', adminOnly: true },
  { icon: Users, label: 'Team', href: '/dashboard/team', adminOnly: true },
  { icon: Truck, label: 'Fleet Dashboard', href: '/dashboard/fleet', adminOnly: false },
  { icon: Route, label: 'Fleet Routes', href: '/dashboard/fleet/routes', adminOnly: false },
  { icon: Car, label: 'Fleet Vehicles', href: '/dashboard/fleet/vehicles', adminOnly: false },
  { icon: UserCircle, label: 'Profile', href: '/dashboard/profile', adminOnly: false },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings', adminOnly: false },
];

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { organizationId, role, isLoading } = useUserOrganization();

  // Subscribe to real-time notification updates
  useNotificationsRealtime();
  
  // Handle PayPal payment capture on return
  usePayPalCapture();
  
  // Handle Crypto payment capture on return
  useCryptoCapture();

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? null);
        
        // Fetch display name from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }
      }
    }
    fetchUserData();
  }, []);

  useEffect(() => {
    async function fetchOrganization() {
      if (organizationId) {
        const { data } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', organizationId)
          .single();
        if (data) {
          setOrganizationName(data.name);
        }
      }
    }
    fetchOrganization();
  }, [organizationId]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col border-r border-border bg-card h-screen sticky top-0 relative"
      >
        {/* Logo & Toggle */}
        {/* Logo & Toggle */}
        <div className={`h-16 flex items-center border-b border-border shrink-0 ${isSidebarOpen ? 'justify-between px-4' : 'justify-center px-2'}`}>
          <Link to="/" className={`flex items-center gap-2 min-w-0 ${!isSidebarOpen ? 'justify-center' : ''}`}>
            <img 
              src={appLogo} 
              alt="LocatePro" 
              className="h-9 w-9 rounded-lg shadow-md shrink-0"
            />
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <span className="text-xl font-bold whitespace-nowrap">
                  Locate<span className="text-gradient">Pro</span>
                </span>
              </motion.div>
            )}
          </Link>
          {isSidebarOpen && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Collapse sidebar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Expand button when collapsed */}
        {!isSidebarOpen && (
          <div className="flex justify-center py-2 border-b border-border">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => setIsSidebarOpen(true)}
                    className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Expand sidebar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems
            .filter((item) => !item.adminOnly || role === 'admin')
            .map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <motion.span
                initial={false}
                animate={{ 
                  opacity: isSidebarOpen ? 1 : 0,
                  width: isSidebarOpen ? 'auto' : 0
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border shrink-0">
          <div className={`flex items-center gap-3 ${isSidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
              {(displayName ?? userEmail)?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <motion.div 
              initial={false}
              animate={{ 
                opacity: isSidebarOpen ? 1 : 0,
                width: isSidebarOpen ? 'auto' : 0
              }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{displayName ?? userEmail ?? 'User'}</p>
                {role && (
                  <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 shrink-0">
                    {role}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{organizationName ?? 'Loading...'}</p>
            </motion.div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={`mt-3 ${isSidebarOpen ? 'w-full justify-start' : 'w-full justify-center'}`}
          >
            <LogOut className="h-4 w-4" />
            <motion.span
              initial={false}
              animate={{ 
                opacity: isSidebarOpen ? 1 : 0,
                width: isSidebarOpen ? 'auto' : 0,
                marginLeft: isSidebarOpen ? 8 : 0
              }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              Logout
            </motion.span>
          </Button>
        </div>

      </motion.aside>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 lg:hidden"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            className="absolute left-0 top-0 bottom-0 w-[280px] bg-card border-r border-border flex flex-col"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-md">
                  <MapPin className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">
                  Locate<span className="text-gradient">Pro</span>
                </span>
              </Link>
              <button onClick={() => setIsMobileSidebarOpen(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
              {navItems
                .filter((item) => !item.adminOnly || role === 'admin')
                .map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </motion.aside>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border bg-card shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <NotificationsPanel />
            <div className="lg:hidden w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
              {(displayName ?? userEmail)?.charAt(0).toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
