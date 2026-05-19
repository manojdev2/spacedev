import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { GoogleMapsProvider } from "@/contexts/GoogleMapsContext";
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SetupGuard } from "./components/auth/SetupGuard";
import { ThemeSync } from "./components/ThemeSync";
import Index from "./pages/Index";
import Locator from "./pages/Locator";
import LocationDetail from "./pages/LocationDetail";
import RegisterStore from "./pages/RegisterStore";
import Favorites from "./pages/Favorites";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import { LoginPage } from "./pages/Login";
import { SignupPage } from "./pages/Signup";
import { SetupPage } from "./pages/Setup";
import { ForgotPasswordPage } from "./pages/ForgotPassword";
import { ResetPasswordPage } from "./pages/ResetPassword";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import LocationsPage from "./pages/dashboard/LocationsPage";
import SubmissionsPage from "./pages/dashboard/SubmissionsPage";
import ReportedReviewsPage from "./pages/dashboard/ReportedReviewsPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import TeamPage from "./pages/dashboard/TeamPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import ContactMessagesPage from "./pages/dashboard/ContactMessagesPage";
import WidgetGeneratorPage from "./pages/dashboard/WidgetGeneratorPage";
import AppointmentsPage from "./pages/dashboard/AppointmentsPage";
import StoreZonesPage from "./pages/dashboard/StoreZonesPage";
import InvoicesPage from "./pages/dashboard/InvoicesPage";
import EmbedWidget from "./pages/EmbedWidget";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <GoogleMapsProvider>
        <ThemeSync />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SetupGuard>
              <Routes>
                {/* Public routes with main layout */}
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/locator" element={<Locator />} />
                  <Route path="/location/:id" element={<LocationDetail />} />
                  <Route path="/register-store" element={<RegisterStore />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                </Route>
                
                {/* Auth routes (no layout) */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                
                {/* Embed widget (no layout, standalone) */}
                <Route path="/embed" element={<EmbedWidget />} />
                
                {/* Protected Dashboard routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<DashboardOverview />} />
                  <Route path="store-zones" element={<StoreZonesPage />} />
                  <Route path="locations" element={<LocationsPage />} />
                  <Route path="submissions" element={<SubmissionsPage />} />
                  <Route path="reported-reviews" element={<ReportedReviewsPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="contact-messages" element={<ContactMessagesPage />} />
                  <Route path="widget" element={<WidgetGeneratorPage />} />
                  <Route path="appointments" element={<AppointmentsPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                </Route>
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SetupGuard>
          </BrowserRouter>
        </TooltipProvider>
      </GoogleMapsProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
