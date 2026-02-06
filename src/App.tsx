import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BackgroundProvider, BackgroundImage } from "@/contexts/BackgroundContext";
import { VIPProvider } from "@/contexts/VIPContext";
import { SecurityGuard } from "@/components/SecurityGuard";

// Public Pages
import Index from "./pages/Index";
import ProfileSelection from "./pages/ProfileSelection";
import Movies from "./pages/Movies";
import Series from "./pages/Series";
import MovieDetail from "./pages/MovieDetail";
import SeriesDetail from "./pages/SeriesDetail";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import LiveChannels from "./pages/LiveChannels";
import Search from "./pages/Search";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import Settings from "./pages/Settings";
import WatchHistory from "./pages/WatchHistory";
import Favorites from "./pages/Favorites";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import AddMovie from "./pages/admin/AddMovie";
import ListMovies from "./pages/admin/ListMovies";
import EditMovie from "./pages/admin/EditMovie";
import AddSeries from "./pages/admin/AddSeries";
import ListSeries from "./pages/admin/ListSeries";
import EditSeries from "./pages/admin/EditSeries";
import ManageAdmins from "./pages/admin/ManageAdmins";
import ManageAvatars from "./pages/admin/ManageAvatars";
import ManageLiveChannels from "./pages/admin/ManageLiveChannels";
import ManageBans from "./pages/admin/ManageBans";
import ManageNotifications from "./pages/admin/ManageNotifications";
import SiteSettings from "./pages/admin/SiteSettings";
import ManageVIP from "./pages/admin/ManageVIP";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <VIPProvider>
            <BackgroundProvider>
              <BackgroundImage />
              <SecurityGuard />
              <Toaster />
              <Sonner />
              
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<ProfileSelection />} />
                <Route path="/browse" element={<Index />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="/series" element={<Series />} />
                <Route path="/movie/:id" element={<MovieDetail />} />
                <Route path="/series/:id" element={<SeriesDetail />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile-setup" element={<ProfileSetup />} />
                <Route path="/live" element={<LiveChannels />} />
                <Route path="/search" element={<Search />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfUse />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/history" element={<WatchHistory />} />
                <Route path="/favorites" element={<Favorites />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="movies" element={<ListMovies />} />
                  <Route path="movies/add" element={<AddMovie />} />
                  <Route path="movies/edit/:id" element={<EditMovie />} />
                  <Route path="series" element={<ListSeries />} />
                  <Route path="series/add" element={<AddSeries />} />
                  <Route path="series/edit/:id" element={<EditSeries />} />
                  <Route path="manage-admins" element={<ManageAdmins />} />
                  <Route path="avatars" element={<ManageAvatars />} />
                  <Route path="live-channels" element={<ManageLiveChannels />} />
                  <Route path="site-settings" element={<SiteSettings />} />
                  <Route path="bans" element={<ManageBans />} />
                  <Route path="notifications" element={<ManageNotifications />} />
                  <Route path="vip" element={<ManageVIP />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BackgroundProvider>
          </VIPProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
