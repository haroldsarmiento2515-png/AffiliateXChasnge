import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import CreatorDashboard from "@/pages/creator-dashboard";
import Browse from "@/pages/browse";
import OfferDetail from "@/pages/offer-detail";
import Applications from "@/pages/applications";
import Analytics from "@/pages/analytics";
import Messages from "@/pages/messages";
import Favorites from "@/pages/favorites";
import Settings from "@/pages/settings";
import PaymentSettings from "@/pages/payment-settings";
import CompanyDashboard from "@/pages/company-dashboard";
import CompanyOffers from "@/pages/company-offers";
import CompanyOfferCreate from "@/pages/company-offer-create";
import CompanyOfferDetail from "@/pages/company-offer-detail";
import CompanyApplications from "@/pages/company-applications";
import CompanyCreators from "@/pages/company-creators";
import CompanyReviews from "@/pages/company-reviews";
import CompanyVideos from "@/pages/company-videos";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminReviews from "@/pages/admin-reviews";
import AdminCompanies from "@/pages/admin-companies";
import AdminOffers from "@/pages/admin-offers";
import Onboarding from "@/pages/onboarding";
import Login from "@/pages/login";
import Register from "@/pages/register";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show landing, login, or register pages while loading or not authenticated
  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Custom sidebar width for the application
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-4 px-6 py-4 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            <div className="container max-w-screen-2xl mx-auto p-6">
              <Switch>
                {/* Creator Routes */}
                {user?.role === 'creator' && (
                  <>
                    <Route path="/" component={CreatorDashboard} />
                    <Route path="/creator/dashboard" component={CreatorDashboard} />
                    <Route path="/browse" component={Browse} />
                    <Route path="/offers/:id" component={OfferDetail} />
                    <Route path="/applications" component={Applications} />
                    <Route path="/analytics" component={Analytics} />
                    <Route path="/messages" component={Messages} />
                    <Route path="/favorites" component={Favorites} />
                  </>
                )}

                {/* Company Routes */}
                {user?.role === 'company' && (
                  <>
                    <Route path="/" component={CompanyDashboard} />
                    <Route path="/company" component={CompanyDashboard} />
                    <Route path="/company/dashboard" component={CompanyDashboard} />
                    <Route path="/company/offers" component={CompanyOffers} />
                    <Route path="/company/offers/create" component={CompanyOfferCreate} />
                    <Route path="/company/offers/:id" component={CompanyOfferDetail} />
                    <Route path="/company/videos" component={CompanyVideos} />
                    <Route path="/company/applications" component={CompanyApplications} />
                    <Route path="/company/creators" component={CompanyCreators} />
                    <Route path="/company/analytics" component={Analytics} />
                    <Route path="/company/messages" component={Messages} />
                    <Route path="/company/reviews" component={CompanyReviews} />
                  </>
                )}

                {/* Admin Routes */}
                {user?.role === 'admin' && (
                  <>
                    <Route path="/" component={AdminDashboard} />
                    <Route path="/admin" component={AdminDashboard} />
                    <Route path="/admin/dashboard" component={AdminDashboard} />
                    <Route path="/admin/companies" component={AdminCompanies} />
                    <Route path="/admin/offers" component={AdminOffers} />
                    <Route path="/admin/reviews" component={AdminReviews} />
                    <Route path="/admin/users" component={AdminDashboard} />
                  </>
                )}

                {/* Shared Routes */}
                <Route path="/settings" component={Settings} />
                <Route path="/payment-settings" component={PaymentSettings} />

                {/* Fallback */}
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
