import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { WishlistProvider } from "@/hooks/useWishlist";
import BottomTabBar from "@/components/BottomTabBar";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import SellPage from "./pages/SellPage";
import MessagesPage from "./pages/MessagesPage";
import MyAdsPage from "./pages/MyAdsPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import EliteDashboardPage from "./pages/EliteDashboardPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import ReviewsPage from "./pages/ReviewsPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import SettingsPage from "./pages/SettingsPage";
import VerificationPage from "./pages/VerificationPage";
import OrdersPage from "./pages/OrdersPage";
import WishlistPage from "./pages/WishlistPage";
import ComplaintsPage from "./pages/ComplaintsPage";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <WishlistProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/my-ads" element={<MyAdsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/elite" element={<EliteDashboardPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/help" element={<HelpSupportPage />} />
        <Route path="/notification-settings" element={<NotificationSettingsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomTabBar />
    </WishlistProvider>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="dentzap-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
